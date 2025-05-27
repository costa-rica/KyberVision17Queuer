require("dotenv").config();
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const cors = require("cors");

const { ExpressAdapter } = require("@bull-board/express");
const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");
const { Queue } = require("bullmq");
const Redis = require("ioredis");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var testJobsRouter = require("./routes/testJobs");
var videoUploaderRouter = require("./routes/videoUploader");
var montageVideoProcessorRouter = require("./routes/montageVideoProcessor");
var youtubeUploaderRouter = require("./routes/youtubeUploader");

var app = express();

app.use(cors());
// Middleware
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Increase payload size for large files
app.use(express.json({ limit: "6gb" }));
app.use(express.urlencoded({ limit: "6gb", extended: true }));

// Redis Connection
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Define Queues
const testJobQueue = new Queue("KyberVisionTestJob03", {
  connection: redisConnection,
});
const videoUploadQueue = new Queue("KyberVisionVideoUploader03", {
  connection: redisConnection,
});
const montageQueue = new Queue("KyberVisionMontageVideoProcessor03", {
  connection: redisConnection,
});
const youtubeUploadQueue = new Queue("KyberVision15YouTubeUploader", {
  connection: redisConnection,
});

// Bull Board setup
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/dashboard"); // Make the dashboard accessible at the "/dashboard" URL

createBullBoard({
  queues: [
    new BullMQAdapter(testJobQueue),
    new BullMQAdapter(videoUploadQueue),
    new BullMQAdapter(montageQueue),
    new BullMQAdapter(youtubeUploadQueue),
  ],
  serverAdapter,
});

// 🟢 Place this above all other routes
app.use("/dashboard", serverAdapter.getRouter()); // This must come before other routes
// Routes
// Use Bull Board Router

app.use("/users", usersRouter);
app.use("/test-jobs", testJobsRouter);
app.use("/video-uploader", videoUploaderRouter);
app.use("/montage-video-processor", montageVideoProcessorRouter);
app.use("/youtube-uploader", youtubeUploaderRouter);
// app.use("/", indexRouter);
module.exports = app;
