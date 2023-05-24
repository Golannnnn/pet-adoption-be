const app = require("./app");
const config = require("./utils/config");
const http = require("http");

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});

module.exports = app;
