const express = require("express");
const router = express.Router();
const { Queue, Worker } = require("bullmq");
const Redis = require("ioredis");
const path = require("path");
const { spawn } = require("child_process");

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Define the queue
const montageQueue = new Queue(process.env.NAME_KV_VIDEO_MONTAGE_MAKER_QUEUE, {
  connection: redisConnection,
});

// Create the worker to process montage jobs
const worker = new Worker(
  process.env.NAME_KV_VIDEO_MONTAGE_MAKER_QUEUE,
  async (job) => {
    console.log(`🎬 Starting Montage Job ID: ${job.id}`);
    const { filename, actionsArray, token, user } = job.data;

    const child = spawn(
      "node",
      [
        "index.js",
        filename,
        JSON.stringify(actionsArray),
        JSON.stringify(user),
        token,
      ],
      {
        cwd: path.join(process.env.PATH_TO_VIDEO_MONTAGE_MAKER_SERVICE),
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    let progress = 0;
    const totalSteps = 5;

    child.stdout.on("data", async (data) => {
      const message = data.toString().trim();
      console.log(`Microservice Output: ${message}`);
      if (message) {
        progress += 1;
        await job.updateProgress((progress / totalSteps) * 100);
        await job.log(message);
      }
    });

    child.stderr.on("data", (data) => {
      console.error(`Microservice Error: ${data}`);
    });

    return new Promise((resolve, reject) => {
      child.on("close", (code) => {
        console.log(`Microservice exited with code ${code}`);
        if (code === 0) {
          resolve({ success: true });
        } else {
          reject(new Error(`Montage process failed with code ${code}`));
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
  console.log(`✅ Montage Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Montage Job ${job.id} failed: ${err.message}`);
});

// POST /video-montage-maker/add
router.post("/add", async (req, res) => {
  try {
    const { filename, actionsArray, token, user } = req.body;

    const job = await montageQueue.add(
      "montage-job",
      { filename, actionsArray, token, user },
      {
        removeOnComplete: false,
        removeOnFail: false,
      }
    );

    console.log(`📥 Job added to montage queue with ID: ${job.id}`);
    res.status(200).json({ message: "Montage job added", jobId: job.id });
  } catch (error) {
    console.error("❌ Error adding montage job:", error.message);
    res.status(500).json({ error: "Failed to queue montage job" });
  }
});

module.exports = router;

// var express = require("express");
// var router = express.Router();
// const { Queue } = require("bullmq");
// const Redis = require("ioredis");

// const redisConnection = new Redis();
// const montageQueue = new Queue(process.env.NAME_KV_VIDEO_MONTAGE_MAKER_QUEUE, {
//   connection: redisConnection,
// });
// // POST /video-montage-maker/add
// router.post("/add", async (req, res) => {
//   const job = await montageQueue.add("montage", req.body);

//   console.log("KyberVision16Queuer ---- Job added to queue with ID: ", job.id);
//   console.log(JSON.stringify(req.body));

//   const { filename, actionsArray, token, user } = req.body;

//   res.json({ message: "Montage video processing job added", jobId: job.id });
// });

// module.exports = router;
