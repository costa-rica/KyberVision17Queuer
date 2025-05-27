var express = require("express");
var router = express.Router();
const { Queue } = require("bullmq");
const Redis = require("ioredis");

const redisConnection = new Redis();
const montageQueue = new Queue("KyberVisionMontageVideoProcessor03", {
  connection: redisConnection,
});

router.post("/add", async (req, res) => {
  const job = await montageQueue.add("montage", req.body);
  res.json({ message: "Montage video processing job added", jobId: job.id });
});

module.exports = router;
