# 🎉 Work Management App

The Work Management App is a task management tool that allows users to create jobs, each containing multiple tasks. Tasks can be marked as either completed or pending. The app also provides the ability to generate and download a final report in PDF format, summarizing the status of all tasks within a job.

## ✨ Features
- **Job Management**: Create, edit, and delete jobs.
- **Task Management**: Add tasks to jobs, mark them as completed or pending.
- **Task Status Tracking**: View tasks under completed or pending categories.
- **PDF Report Generation**: Generate a final report of the job, showing completed and pending tasks, in PDF format.

## 🛠 Tech Stack
- **Backend**: Node.js, Express.js
- **Frontend**: EJS (Embedded JavaScript)
- **Database**: MongoDB

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/) (v4 or higher)

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/isanjeevroy/work-management.git
   cd work-management
2. Install dependencies:
   ```bash
   npm install
3. Set up environment variables:
   ```bash
   MONGODB_URI=your_mongodb_connection_string
   PORT=3000
4. Start the development server:
   ```bash
   npm run dev
5. Visit `http://localhost:3000` in your browser to use the app.
