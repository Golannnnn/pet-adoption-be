const cron = require("node-cron");
const https = require("https");
const backendUrl = require("./config").BACKEND_URL;

const task = cron.schedule(
  "*/14 * * * *",
  () => {
    https
      .get(`${backendUrl}`, (res) => {
        if (res.statusCode === 200) {
          console.log("Ping to backend successful");
        } else if (res.statusCode === 404) {
          console.log("Ping to backend failed");
        }
      })
      .on("error", (err) => {
        console.log("Ping to backend failed", err);
      });
  },
  {
    scheduled: false,
  }
);

module.exports = task;
