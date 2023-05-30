const petsRouter = require("express").Router();
const Pet = require("../models/pet");
const auth = require("../utils/middleware").auth;
const upload = require("../utils/middleware").upload;

petsRouter.get("/", async (request, response) => {
  const pets = await Pet.find({});
  response.status(200).json(pets);
});

petsRouter.get("/:id", async (request, response) => {
  const { id } = request.params;

  const pet = await Pet.findById(id);

  if (pet) {
    response.status(200).json(pet);
  } else {
    response.status(404).send({
      error: "Pet not found",
    });
  }
});

petsRouter.get("/user/:id", async (request, response) => {
  const { id } = request.params;

  const pet = await Pet.find({
    userId: id,
  });

  response.status(pet.length > 0 ? 200 : 404).json(pet);
});

petsRouter.get("/search/:query", async (request, response) => {
  const { query } = request.params;
  const queryObject = Object.fromEntries(
    query.split("&").map((pair) => pair.split("="))
  );

  const filter = {};

  if (queryObject.type !== "any") filter.type = queryObject.type;
  if (queryObject.size !== "any") filter.size = queryObject.size;
  if (queryObject.status !== "any") filter.status = queryObject.status;

  const regexOptions = { $options: "i" };
  const stringFields = ["breed", "name", "color"];
  stringFields.forEach((field) => {
    if (queryObject[field])
      filter[field] = { $regex: queryObject[field], ...regexOptions };
  });

  if (filter.size === "large") {
    filter.height = { $gt: 10 };
    delete filter.size;
  } else if (filter.size === "medium") {
    filter.height = { $gt: 5, $lt: 10 };
    delete filter.size;
  } else if (filter.size === "small") {
    filter.height = { $lt: 5 };
    delete filter.size;
  }

  const pets = await Pet.find(filter);

  response.status(200).json(pets);
});

petsRouter.post(
  "/create",
  auth,
  upload.single("picture"),
  async (request, response) => {
    const { ...rest } = request.body;
    const path = request.file.path;

    const pet = new Pet({
      ...rest,
      picture: path,
    });

    const existingPet = await Pet.findOne({
      name: pet.name,
      type: pet.type,
      breed: pet.breed,
      height: pet.height,
      weight: pet.weight,
    });

    if (existingPet) {
      response.status(409).json({
        error: "Pet already exists",
      });
    }

    const savedPet = await pet.save();

    response.status(201).json(savedPet);
  }
);

petsRouter.put(
  "/:id",
  auth,
  upload.single("picture"),
  async (request, response) => {
    const { id } = request.params;
    const { ...rest } = request.body;

    if (request.file) {
      const path = request.file.path;
      rest.picture = path;
    }

    const filter = { _id: id };
    const update = { ...rest };

    const updatedPet = await Pet.findOneAndUpdate(filter, update, {
      new: true,
    });

    response.status(200).json(updatedPet);
  }
);

petsRouter.patch("/change-status/:id", auth, async (request, response) => {
  const { id: petId } = request.params;
  const { id: userId } = request.user;
  const { action } = request.body;

  const pet = await Pet.findById(petId);

  if (!pet) {
    response.status(404).json({ error: "Pet not found" });
    return;
  }

  if (action === "foster") {
    pet.fosteredBy = userId;
  } else if (action === "adopt") {
    pet.adoptedBy = userId;
    pet.fosteredBy = null;
  } else if (action === "return") {
    pet.adoptedBy = null;
    pet.fosteredBy = null;
  } else if (action === "save") {
    pet.savedBy.push(userId);
  } else if (action === "unsave") {
    pet.savedBy.pull(userId);
  } else {
    response.status(400).json({ error: "Invalid action" });
    return;
  }

  const savedPet = await pet.save();

  const changedFields = {
    status: savedPet.status,
    fosteredBy: savedPet.fosteredBy,
    adoptedBy: savedPet.adoptedBy,
  };

  response.status(200).json(changedFields);
});

module.exports = petsRouter;
