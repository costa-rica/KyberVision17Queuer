# Kyber Vision Job Queuer

- v 0.17.0

## Description

KyberVision17Queuer is an ExpressJS application designed to manage and monitor jobs using BullMQ and Bull Board. It serves as a centralized job queue manager for various microservices in the Kyber Vision ecosystem.

The application is designed to:

- Trigger jobs for connected microservices (e.g., KyberVisionTestJob03, KyberVision17YouTubeUploader).
- Monitor job progress and logs through a Bull Board dashboard available at `/dashboard`.
- Ensure sequential processing of jobs to maintain order and efficiency.

---

## Features

- 📊 **BullMQ Integration**: Queue management powered by Redis and BullMQ.
- 📋 **Bull Board Dashboard**: Provides a visual interface to monitor queues and inspect job logs.
- 🔒 **Sequential Job Processing**: Ensures jobs are processed one at a time when necessary.
- 🔗 **Microservice Integration**: Communicates with various microservices via queues.

---

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
```

2. Install dependencies using Yarn:

```bash
yarn install
```

- install redis on Mac: `brew install redis`

#### 2.1 install redis on Ubuntu

- last time I first did this install redis on Ubuntu: `sudo apt install redis-server -y`
- server: kv15
- then:

```bash
sudo apt-get install lsb-release curl gpg
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
sudo chmod 644 /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
sudo apt-get update
sudo apt-get install redis
```

#### 2.2 install update to redis on Ubuntu

##### if you get this error in error log

```bash
2025-07-04 14:42 +00:00: It is highly recommended to use a minimum Redis version of 6.2.0
2025-07-04 14:42 +00:00:              Current: 5.0.7
```

##### solution

```bash
sudo add-apt-repository ppa:redislabs/redis
sudo apt update
sudo apt install redis
```

- verify it worked: `redis-server --version`
- stop and start redis:

```bash
sudo systemctl stop redis
sudo systemctl start redis
```

3. Set up your `.env` file with Redis configuration:

```bash
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
PORT=8003
APP_NAME=KyberVision17Queuer
PATH_TO_TEST_JOB_SERVICE=/Users/nick/Documents/KyberVisionTestJob03/
```

#### 3.1 to run YouTube Uploader

```bash
PATH_TO_YOUTUBE_UPLOADER_SERVICE=/Users/nick/Documents/KyberVision17YouTubeUploader/
PATH_VIDEOS_UPLOAD03=/Users/nick/Documents/_project_resources/KyberVision17API/session_videos/upload03
YOUTUBE_CLIENT_ID=someId-id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=secret
YOUTUBE_REDIRECT_URI=http://localhost
YOUTUBE_REFRESH_TOKEN=refresh_token
YOUTUBE_UPLOADER_QUEUE_NAME=KyberVision17YouTubeUploader
```

#### 3.2 connection to db

```bash
NAME_DB=kv15.db
NAME_KV_VIDEO_PROCESSOR=videoProcessor.js
PATH_DATABASE=/Users/nick/Documents/_databases/KyberVision17API/
```

---

### Video Montage Maker

- URL_LOCAL_KV_API_FOR_VIDEO_MONTAGE_MAKER is absolutely necessary for the Video Montage Maker to function. --- > the montage maker can only make requests using the local address of the API.

```bash
URL_LOCAL_KV_API_FOR_VIDEO_MONTAGE_MAKER=http://localhost:3000
```

## Redis Commands (Mac & Ubuntu)

### Delete queue from terminal (Mac)

- Delete All Data: `redis-cli FLUSHALL`
- Delete Specific Database: `redis-cli -n 0 FLUSHDB`
- Delete Specific Queue: `redis-cli --raw keys "*KyberVisionVideoUploader03*" | xargs redis-cli del`

### 📌 **Starting Redis in the Background**

#### MacOS (using Homebrew)

```bash
brew services start redis
```

#### Ubuntu (using systemd)

```bash
sudo systemctl start redis
```

---

### 📌 **Checking Redis Status**

```bash
redis-cli ping
```

#### MacOS (using Homebrew)

```bash
brew services list | grep redis
```

#### Ubuntu (using systemd)

```bash
sudo systemctl status redis
```

---

### 📌 **Stopping Redis**

#### MacOS (using Homebrew)

```bash
brew services stop redis
```

#### Ubuntu (using systemd)

```bash
sudo systemctl stop redis
```

---

### 📌 **Restarting Redis (If Needed)**

#### MacOS (using Homebrew)

```bash
brew services restart redis
```

#### Ubuntu (using systemd)

```bash
sudo systemctl restart redis
```

---

These commands will help you manage the Redis server on both Mac and Ubuntu systems.

---

## Usage

1. **Start Redis Server**:

```bash
redis-server
```

2. **Start KyberVision17Queuer Server**:

```bash
yarn start
```

3. **Access Bull Board Dashboard**:

```
http://localhost:8003/dashboard
```

4. **Trigger a Job via API** (Example for Test Jobs):

```bash
curl -X POST http://localhost:8003/test-jobs/add
```

```bash
curl -X POST http://localhost:8003/video-uploader/process \
--header "Content-Type: application/json" \
--data '{"filename": "Video01_trimmed.mp4"}'
```

---

## Routes

- **`POST /test-jobs/add`** - Adds a new test job to the queue.
- **`GET /dashboard`** - Access the Bull Board dashboard to monitor job queues.

---

## Dependencies

- `express` - For handling routes and middleware.
- `bullmq` - For managing job queues.
- `@bull-board/express` - For creating a visual interface for monitoring queues.
- `ioredis` - For connecting to Redis.

---

## Understanding the code for child process

```js
const child = spawn("node", ["index.js"], {
  cwd: path.join(process.env.PATH_TO_TEST_JOB_SERVICE),
  stdio: ["pipe", "pipe", "pipe"], // Make sure to capture stdout and stderr
});
```

It is an array of three elements: [stdin, stdout, stderr].

- "pipe": This allows the parent process to directly communicate with the child process via streams. By using "pipe", you are telling Node.js:
  - "pipe" for stdin: The parent process can send data to the child process.
  - "pipe" for stdout: The parent process can read the standard output of the child process.
  - "pipe" for stderr: The parent process can read the standard error output of the child process.

## License

MIT License
