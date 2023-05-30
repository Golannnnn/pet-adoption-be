const bcrypt = require("bcrypt");
const usersRouter = require("express").Router();
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const auth = require("../utils/middleware").auth;

usersRouter.post("/signup", async (request, response) => {
  const { email, password, name, number } = request.body;

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const user = new User({
    email,
    passwordHash,
    name,
    number,
  });

  const savedUser = await user.save();

  response.status(201).json(savedUser);
});

usersRouter.post("/login", async (request, response) => {
  const { email, password } = request.body;

  const existingUser = await User.findOne({ email });

  if (!existingUser) {
    return response.status(401).json({
      error: "invalid email or password",
    });
  }

  const passwordCorrect = await bcrypt.compare(
    password,
    existingUser.passwordHash
  );

  if (!passwordCorrect) {
    return response.status(401).json({
      error: "invalid email or password",
    });
  }

  const payload = {
    id: existingUser._id,
  };

  jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: "30d" },
    (err, token) => {
      if (err) {
        return response.status(500).json({ error: "failed to generate token" });
      }

      return response.status(200).json({
        message: "Login successful",
        token,
        email: existingUser.email,
        name: existingUser.name,
        number: existingUser.number,
        id: existingUser._id,
        isAdmin: existingUser.isAdmin,
      });
    }
  );
});

usersRouter.put("/update", auth, async (request, response) => {
  const { email, password, name, number, id } = request.body;

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const filter = { _id: id };
  const update = {
    email,
    passwordHash,
    name,
    number,
  };

  const updatedUser = await User.findOneAndUpdate(filter, update, {
    new: true,
  });
  response.status(200).json(updatedUser);
});

usersRouter.get("/me", auth, async (request, response) => {
  const { id } = request.user;

  const user = await User.findById(id);

  if (!user) {
    return response
      .status(404)
      .json({ error: "user not found", isLoggedIn: false });
  }

  response.status(200).json({
    id: user._id,
    email: user.email,
    name: user.name,
    number: user.number,
    isLoggedIn: true,
    isAdmin: user.isAdmin,
  });
});

usersRouter.get("/all", auth, async (request, response) => {
  const { id } = request.user;

  const user = await User.findById(id);

  if (!user.isAdmin) {
    return response.status(401).json({
      error: "unauthorized",
    });
  }

  const users = await User.find({});

  response.status(200).json(users);
});

usersRouter.get("/google-login", auth, async (request, response) => {
  const token = request.headers.authorization?.split(" ")[1];
  const { email } = request.user;
  const { id } = request.user;

  let userExists;

  if (!id && email) {
    userExists = await User.findOne({ email });
  }

  if (id && !email) {
    userExists = await User.findById(id);
  }

  if (!userExists) {
    const match = email.match(/^([^@]+)/)[1];
    const user = new User({
      email,
      name: match,
      number: "0000000000",
    });

    const savedUser = await user.save();

    response.status(201).json({
      savedUser,
      google_token: token,
    });
  }

  response.status(200).json({
    userExists,
    google_token: token,
  });
});

module.exports = usersRouter;
