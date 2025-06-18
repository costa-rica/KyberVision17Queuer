const express = require("express");
const { Queue, Worker } = require("bullmq");
const Redis = require("ioredis");
const router = express.Router();

const path = require("path");
const { spawn } = require("child_process");

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Define the queue with a Redis connection
// const testJobQueue = new Queue(process.env.APP_NAME, {
//   connection: redisConnection,
// });
const youtubeUploadQueue = new Queue(process.env.YOUTUBE_UPLOADER_QUEUE_NAME, {
  connection: redisConnection,
});

// Create a worker to process jobs from the queue
const worker = new Worker(
  // process.env.APP_NAME,
  process.env.YOUTUBE_UPLOADER_QUEUE_NAME,
  async (job) => {
    console.log(`⚙️ Starting Job ID: ${job.id}`);

    // Spawn a child process to run the microservice
    const { filename, videoId } = job.data;

    console.log("--- New Logging ---");
    console.log(`filename: ${filename}`);
    console.log(`videoId: ${videoId}`);

    const child = spawn(
      "node",
      ["index.js", "--filename", filename, "--videoId", videoId],
      {
        cwd: path.join(process.env.PATH_TO_YOUTUBE_UPLOADER_SERVICE),
        stdio: ["pipe", "pipe", "pipe"],
      }
    );
    // Keep track of progress
    let progress = 0;
    const totalSteps = 5; // Number of steps in your microservice

    // Capture the stdout stream (Output from the microservice)
    child.stdout.on("data", async (data) => {
      const message = data.toString().trim();
      console.log(`Microservice Output: ${message}`);

      if (message) {
        progress += 1;
        await job.updateProgress((progress / totalSteps) * 100); // Update progress in BullMQ
        await job.log(message); // Log each step to BullMQ
      }
    });

    // Capture the stderr stream (Errors from the microservice)
    child.stderr.on("data", (data) => {
      console.error(`Microservice Error: ${data}`);
    });

    // Capture the 'close' event when the process finishes
    return new Promise((resolve, reject) => {
      child.on("close", (code) => {
        console.log(`Microservice exited with code ${code}`);
        if (code === 0) {
          resolve({ success: true });
        } else {
          reject(new Error(`Microservice failed with code ${code}`));
        }
      });
    });
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

worker.on("completed", (job) => {
  console.log(`🎉 Job ${job.id} has been completed!`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job.id} failed: ${err.message}`);
});

// POST /youtube-uploader/add
router.post("/add", async (req, res) => {
  try {
    let { filename, videoId, queueName } = req.body;

    if (!queueName) {
      console.error("- No queue name provided, assigning default name");
      queueName = process.env.YOUTUBE_UPLOADER_QUEUE_NAME;
    }

    console.log(`Adding job to queue: ${queueName}`);
    // Create a dynamic queue using the name passed
    const dynamicQueue = new Queue(queueName, {
      connection: redisConnection,
    });

    const job = await dynamicQueue.add(
      "youtube-upload-job",
      {
        filename,
        videoId,
      },
      {
        removeOnComplete: false,
        removeOnFail: false,
      }
    );

    console.log(`Job added to queue '${queueName}' with ID: ${job.id}`);

    res
      .status(200)
      .json({ message: "Job triggered successfully!", jobId: job.id });
  } catch (error) {
    console.error("❌ Error triggering job:", error.message);
    res.status(500).json({ error: "Error triggering job" });
  }
});

module.exports = router;
