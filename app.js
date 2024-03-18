if(process.env.NDOE_ENV !="production"){
    require('dotenv').config();
}
const express = require('express');
const app = express();
const port = 3000;
const mongoose = require("mongoose");
const path = require('path');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const session = require("express-session");
const Job = require("./models/job.js");
const User = require("./models/user.js");
const WrapAsync = require("./utils/WrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const flash = require("connect-flash");
const MongoStore = require('connect-mongo');
const fs = require('fs');
const passport = require("passport");
const localStrategy = require("passport-local");
const puppeteer = require('puppeteer-core');
// const puppeteer = require('puppeteer-extra');
// const pluginStealth = require('puppeteer-extra-plugin-stealth');
// puppeteer.use(pluginStealth());


// Databases connection
// const MONGO_URL = "mongodb://127.0.0.1:27017/sujeetwork";
const MONGO_URL = process.env.ATLAS_URL;

main().then(() => {
    console.log("Connected to DB");
}).catch(err => {
    console.log(err);
});

async function main() {
await mongoose.connect(MONGO_URL);
}

// middlewares
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views')) 
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, '/public')));



const store = MongoStore.create({
    mongoUrl: MONGO_URL,
    crypto:{
        secret: process.env.SECRET,
    },
    touchAfter: 24* 3600,
});

store.on("error",()=>{
    console.log("ERROR IN MONGO SESSION STORE",err);
})
const sessionOptions ={
    store,
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true, 
    },
};
app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    res.locals.currUser=req.user;
    next();
});

// Registration
app.get("/signup",async(req,res)=>{
    res.render("users/signup.ejs");
});

// app.post("/signup",async(req,res)=>{
//     try{
//         let {username,email,password}= req.body;
//         const newUser = new User({email,username});
//         const registerdUser = await User.register(newUser,password);
//         console.log(registerdUser);

//             req.login(registerdUser,(err)=>{
//                 if(err){
//                     return next(err);
//                 }
//                 req.flash("success","Welcome to Wanderlust");
//                 res.redirect("/data");
//             }); 
//     }catch(e){ 
//         req.flash("error",e.message);
//         res.redirect("/signup");
//     }
// });

// Login
app.get("/login",(req,res)=>{
    res.render("users/login.ejs");
})

app.post("/login",
passport.authenticate("local",{
    failureRedirect:'/login',
     failureFlash: true
    }),
    async(req,res)=>{
    req.flash("success","Welcome back to page!");
    res.redirect("/data");
}
);


//Logout
app.get("/logout",(req,res)=>{
    req.logout((err)=>{
        if(err){
            return next(err);
        }
        req.flash("success","you are logged out!");
        res.redirect("/login");
    });
});

//  PRINTING TABLE------------------------

// print data
app.get("/:jobId/print-data", async (req, res) => {
    const jobId = req.params.jobId;
    const data = await Job.findById(jobId);
    res.render("print-data.ejs",{data});
  
});

//print Route - Button

app.get("/print/:jobId", async (req, res) => {
    const jobId = req.params.jobId;
    if (!req.isAuthenticated()) {
        req.flash("error", "You must be logged in to print.");
        return res.redirect("/login");
    }

    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(`${req.protocol}://${req.get('host')}/${jobId}/print-data`, {
            waitUntil: "networkidle2"
        });
        await page.setViewport({ width: 2080, height: 1050 });
        
        // Generate PDF as a buffer
        const pdfBuffer = await page.pdf({
            printBackground: true,
            format: "A4"
        });

        await browser.close();

        // Send PDF as response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${jobId}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error generating PDF");
    }
});


// Index Route
app.get("/data",WrapAsync(async(req,res)=>{
    if(!req.isAuthenticated()){
        req.flash("error","you must be logged to access!");
        return res.redirect("/login");
    }
    const perPage = 1; 
    const page = parseInt(req.query.page) || 1;
    const allData = await Job.find({});
    const totalDataCount = allData.length;
    const totalPages = Math.ceil(totalDataCount / perPage);

    // Slice the data array to get the data for the current page
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const currentData = allData.slice(startIndex, endIndex);
    // Render the EJS template with data and pagination variables
    res.render("features/data.ejs", { allData: currentData, currentPage: page, totalPages: totalPages });
}));




// New Job Form Route
app.get("/newjob",(req,res)=>{
    if(!req.isAuthenticated()){
        req.flash("error","you must be logged to create new job!");
        return res.redirect("/login");
    }
    res.render("features/new-job.ejs");
})

//  Create new Job
app.post("/newjob",WrapAsync(async(req,res)=>{
    if(!req.isAuthenticated()){
        req.flash("error","you must be logged in to create new job!");
        return res.redirect("/login");
    }
    const {job_name} = req.body;
        const firstWork = await Job.findOne();
        const newJob = new Job({
            job_name: job_name,
            works: []
        });

        if (firstWork) {
            for (const work of firstWork.works) {
                newJob.works.push({ name: work.name, status: false });
            }
        }
        await newJob.save();
        // find total pages
        const perPage = 1; 
        const allData = await Job.find({});
        const totalDataCount = allData.length;
        const totalPages = Math.ceil(totalDataCount / perPage);
        req.flash("success","New Job has created!");
       res.redirect(`/data?page=${totalPages}`);
}));

//Delete Job Route
// app.get("/delete/:jobId",WrapAsync(async(req,res)=>{
//     const jobId = req.params.jobId;

//     const deletedJob = await Job.findByIdAndDelete(jobId);
//     const previousUrl = req.get('Referer') || '/';
//     const { pathname, search } = new URL(previousUrl); // Parse the previous URL
//     const params = new URLSearchParams(search); // Parse the query string
//     const page = params.get('page'); // Get the value of the 'page' parameter
//     const pageNo = (page>2)?page-1:1;
//     req.flash("error","Job has deleted!");
//     res.redirect(`/data?page=${pageNo}`);
// }));

app.get("/delete/:jobId", WrapAsync(async(req, res) => {
    if(!req.isAuthenticated()){
        req.flash("error","you must be logged in to delete job!");
        return res.redirect("/login");
    }
  const previousUrl1 = req.session.urlHistory && req.session.urlHistory.length >= 2 ? req.session.urlHistory[req.session.urlHistory.length - 2] : "/";
    const previousUrl2 = req.session.urlHistory && req.session.urlHistory.length >= 3 ? req.session.urlHistory[req.session.urlHistory.length - 3] : "/";

  const jobId = req.params.jobId;
  const alertMessage = "Are you sure you want to delete the job?";
  res.render('deleteConfirmation', { alertMessage,jobId });
}));


app.get("/confirm-delete/:jobId", WrapAsync(async(req, res) => {
    if(!req.isAuthenticated()){
        req.flash("error","you must be logged in to delete the job!");
        return res.redirect("/login");
    }
  const jobId = req.params.jobId;

  const deletedJob = await Job.findByIdAndDelete(jobId);
  const previousUrl = req.get('Referer') || '/';
//   console.log(previousUrl);
  const { pathname, search } = new URL(previousUrl); // Parse the previous URL
  const params = new URLSearchParams(search); // Parse the query string
  const page = params.get('page'); // Get the value of the 'page' parameter
  const pageNo = (page > 2) ? page - 1 : 1;
  req.flash("error", "Job has been deleted!");
  res.redirect(`/data?page=${pageNo}`);
}));

// new work 
app.post("/job/:jobId", WrapAsync(async(req,res)=>{
    if(!req.isAuthenticated()){
        req.flash("error","you must be logged in to create new work!");
        return res.redirect("/login");
    }
        const {name} = req.body;
        const { jobId } = req.params;
        const job = await Job.findById(jobId);
        job.works.push({ name, status:false });
        await job.save();

        const previousUrl = req.get('Referer') || '/';
        const { pathname, search } = new URL(previousUrl); // Parse the previous URL
        const previousPathWithQuery = `${pathname}${search}`; // Combine pathname and search
        res.redirect(previousPathWithQuery);
   
}));

// Update work status
app.get("/job/:jobId/work/:workId/update",WrapAsync(async(req,res)=>{
    if(!req.isAuthenticated()){
        req.flash("error","you must be logged in to update work!");
        return res.redirect("/login");
    }
        // console.log(req.url);
        const { jobId, workId } = req.params;
        const job = await Job.findById(jobId);
        const work = job.works.id(workId);
        work.status =(work.status)?false:true;
        await job.save();

        const previousUrl = req.get('Referer') || '/';
        const { pathname, search } = new URL(previousUrl); // Parse the previous URL
        const previousPathWithQuery = `${pathname}${search}`; // Combine pathname and search
        // req.flash("success","Your status has update!");
        res.redirect(previousPathWithQuery);
}));

// Route to delete work
app.get("/job/:jobId/work/:workId/delete",WrapAsync(async(req, res) => {
    if(!req.isAuthenticated()){
        req.flash("error","you must be logged in to delete!");
        return res.redirect("/login");
    }

        const { jobId, workId } = req.params;
        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).flash("error","Doesn't exist any job of this id");
        }

        // Find the index of the work by ID
        const workIndex = job.works.findIndex(work => work._id == workId);

        job.works.splice(workIndex, 1);
        await job.save();

        const previousUrl = req.get('Referer') || '/';
        const { pathname, search } = new URL(previousUrl); // Parse the previous URL
        const previousPathWithQuery = `${pathname}${search}`; // Combine pathname and search
        req.flash("error","Your status has update!");
        res.redirect(previousPathWithQuery);

}));



app.get("/", (req, res) => {
  res.send("I'm Root");
});

// Not Found Route
app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"Page Not Found!"));
});

app.use((err,req,res,next)=>{
    let {statusCode=500,message="Something went wrong!"}=err;
    res.status(statusCode).render("error.ejs",{message});
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});