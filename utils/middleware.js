require("dotenv").config();
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/user");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "pet_adoption",
    transformation: [{ height: 380, crop: "scale" }],
    allowedFormats: ["jpg", "png", "jpeg", "gif", "webp"],
  },
});

const upload = multer({ storage: storage });

const requestLogger = (request, response, next) => {
  console.log("Method:", request.method);
  console.log("Path:  ", request.path);
  console.log("Body:  ", request.body);
  console.log("---");
  next();
};

const auth = async (request, response, next) => {
  const token = request.headers.authorization?.split(" ")[1];
  const type = request.headers.tokentype;

  if (!token) {
    return response
      .status(401)
      .json({ error: "token missing", isLoggedIn: false });
  }

  if (type === "google") {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const tokenInfo = await client.getTokenInfo(token);

    if (!tokenInfo) {
      return response
        .status(401)
        .json({ error: "token invalid", isLoggedIn: false });
    }

    const user = await User.findOne({ email: tokenInfo.email });

    if (!user) {
      request.user = {
        email: tokenInfo.email,
      };
    } else {
      request.user = {
        id: user._id,
      };
    }

    next();
  }

  if (type === "jwt") {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return response
          .status(401)
          .json({ error: "token invalid", isLoggedIn: false });
      }

      request.user = {
        id: decoded.id,
      };

      next();
    });
  }
};

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: "unknown endpoint" });
};

const errorHandler = (error, request, response, next) => {
  console.error(error.message);
  if (error.name === "CastError") {
    return response.status(400).send({ error: "malformatted id" });
  } else if (error.name === "ValidationError") {
    return response.status(400).json({ error: error.message });
  }
  next(error);
};

module.exports = {
  requestLogger,
  auth,
  unknownEndpoint,
  errorHandler,
  upload,
};
