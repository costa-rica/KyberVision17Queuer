var express = require("express");
var router = express.Router();
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

const videoUploadQueue = new Queue("KyberVisionVideoUploader03", {
  connection: redisConnection,
});

const worker = new Worker(
  "KyberVisionVideoUploader03",
  async (job) => {
    console.log(`⚙️ Starting Job ID: ${job.id}`);

    const filename = job.data.filename; // Extracting the filename from the job data
    const videoId = job.data.videoId;

    console.log(`videoId: ${videoId}`);

    // const filename = job.data.filename;
    if (!filename) {
      console.error("❌ No filename provided in job data");
      await job.log("❌ No filename provided in job data");
      throw new Error("No filename provided in job data");
    }

    const child = spawn("node", ["index.js", filename, videoId], {
      cwd: path.join(process.env.PATH_TO_KV_VIDEO_UPLOADER_SERVICE),
      stdio: ["pipe", "pipe", "pipe", "ipc"], // 1) is for sending args in, 2) reading outputs,
      // 3) reading errors, 4) ipc - for sending messages between processes not cluttering up logs (used for progress updates)
    });

    child.on("message", async (message) => {
      if (message.type === "progress") {
        const progress = message.percent;
        await job.updateProgress(progress);
        // console.log(`Updating progress to ${progress}%`);
      }
    });

    child.stdout.on("data", async (data) => {
      const messages = data.toString().split("\n"); // Split the data by newline

      for (let message of messages) {
        message = message.trim(); // Clean up any extra whitespace

        // if (message.startsWith("percent complete: ")) {
        //   const progressStr = message
        //     .substring("percent complete: ".length)
        //     .trim();
        //   const progress = Number(progressStr);

        //   if (!isNaN(progress)) {
        //     // console.log(`Updating progress to ${progress}%`);

        //     await job.updateProgress(progress);
        //   } else {
        //     console.log(`Invalid progress value: ${progressStr}`);
        //     await job.log(message);
        //   }
        // } else if (message) {
        console.log(`[KyberVisionVideoUploader03] ${message}`);
        await job.log(`[KyberVisionVideoUploader03] ${message}`);
        // }
      }
    });

    // Capture the stderr stream (Errors from the microservice)
    child.stderr.on("data", async (data) => {
      const errorMessage = data.toString().trim();
      console.error(`Microservice Error: ${errorMessage}`);
      await job.log(`Microservice Error: ${errorMessage}`);
    });
    // Capture the 'close' event when the process finishes
    return new Promise((resolve, reject) => {
      child.on("close", (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          const errorMsg = `Microservice failed with code ${code}`;
          console.error(errorMsg);
          job.log(errorMsg);
          reject(new Error(errorMsg));
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

router.post("/process", async (req, res) => {
  const job = await videoUploadQueue.add("videoUpload", req.body);
  res.json({ message: "Video upload job added", jobId: job.id });
});

module.exports = router;
