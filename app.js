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
const WrapAsync = require("./utils/WrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const flash = require("connect-flash");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const puppeteer = require('puppeteer');


// Databases connection
// const MONGO_URL = "mongodb://127.0.0.1:27017/sujeetwork";
const dbUrl = process.env.ATLAS_URL;

main().then(() => {
    console.log("Connected to DB");
}).catch(err => {
    console.log(err);
});

async function main() {
await mongoose.connect(dbUrl);
}

// middlewares
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views')) 
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, '/public')));


const sessionOptions ={
    secret:"rajivchutiya",
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

app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    next();
});

// print data
app.get("/print/:jobId", async(req, res) => {

  const jobId = req.params.jobId;
  const data = await Job.findById(jobId);
  if (!data) {
    req.flash("error","Job not found");
    return res.status(404).redirect("/"); // Redirect to home page or an error page
  }

  const doc = new PDFDocument();

  // Get current date and time
  const currentDate = new Date().toLocaleString(); // Get current date and time
  
  // Print current date and time at top right side
  doc.text(`Date and Time: ${currentDate}`, { align: 'right', width: 300 });

  // Set up PDF content
  doc.moveDown(2).fontSize(18).text(data.job_name, { align: 'center' }).moveDown(1);
  
  // Arrays to store completed and pending works
  const completedWorks = [];
  const pendingWorks = [];

  // Separate completed and pending works
  data.works.forEach(work => {
    if (work.status) {
      completedWorks.push(work.name);
    } else {
      pendingWorks.push(work.name);
    }
  });

  // Function to calculate padding for numerical numbering
  function calculatePadding(num) {
    const maxLength = completedWorks.length + pendingWorks.length;
    return (maxLength.toString().length - num.toString().length) + 1;
  }

  // Print completed works
  doc.moveDown().fontSize(15).fillColor('green').text('Completed Status:');
  completedWorks.forEach((work, index) => {
    const padding = calculatePadding(index + 1);
    doc.moveDown().fontSize(12).fillColor('black').text(`${index + 1}.${' '.repeat(padding)}${work}`);
  });

  // Print pending works
  doc.moveDown().fontSize(15).fillColor('red').text('Pending Status:');
  pendingWorks.forEach((work, index) => {
    const padding = calculatePadding(index + 1);
    doc.moveDown().fontSize(12).fillColor('black').text(`${index + 1}.${' '.repeat(padding)}${work}`);
  });

  // Finalize PDF
  doc.end();

  // Set response headers for PDF download
  res.setHeader('Content-Disposition', 'attachment; filename="output.pdf"');
  res.setHeader('Content-Type', 'application/pdf');

  // Pipe the PDF document to the response stream
  doc.pipe(res);
});





// Index Route
app.get("/data",WrapAsync(async(req,res)=>{
   
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
    res.render("features/new-job.ejs");
})

//  Create new Job
app.post("/newjob",WrapAsync(async(req,res)=>{
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
  const previousUrl1 = req.session.urlHistory && req.session.urlHistory.length >= 2 ? req.session.urlHistory[req.session.urlHistory.length - 2] : "/";
    const previousUrl2 = req.session.urlHistory && req.session.urlHistory.length >= 3 ? req.session.urlHistory[req.session.urlHistory.length - 3] : "/";

  const jobId = req.params.jobId;
  const alertMessage = "Are you sure you want to delete this job?";
  res.render('deleteConfirmation', { alertMessage,jobId });
}));


app.get("/confirm-delete/:jobId", WrapAsync(async(req, res) => {
  const jobId = req.params.jobId;

  const deletedJob = await Job.findByIdAndDelete(jobId);
  const previousUrl = req.get('Referer') || '/';
  console.log(previousUrl);
  const { pathname, search } = new URL(previousUrl); // Parse the previous URL
  const params = new URLSearchParams(search); // Parse the query string
  const page = params.get('page'); // Get the value of the 'page' parameter
  const pageNo = (page > 2) ? page - 1 : 1;
  req.flash("error", "Job has been deleted!");
  res.redirect(`/data?page=${pageNo}`);
}));













// new work 
app.post("/job/:jobId", WrapAsync(async(req,res)=>{
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