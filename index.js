const mongoose = require("mongoose");
const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
var cors = require("cors");
var http = require("http");
const { Server } = require("socket.io");
const { Configuration, OpenAIApi } = require("openai");

dotenv.config();

const config = new Configuration({
  apiKey: "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",
});

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-08-01",
});


const users = require("./routes/users");
const resetPasswordRoute = require("./routes/passwordReset");
const blogs = require("./routes/blogs");
const drugs = require("./routes/drugs");

const app = express();
const openai = new OpenAIApi(config);


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB ..."))
  .catch((err) => console.error("Could not connect to MongoDB ..."));

app.use(cors());
app.use(express.json({ limit: "200mb" }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (data) => {
    socket.join(data);
    console.log(`User with ID: ${socket.id} joined room: ${data}`);
  });

  socket.on("send_message", (data) => {
    socket.to(data.room).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });


  // -------------------------------

  socket.on("room:join", (data) => {
    const { email, room } = data;
    emailToSocketIdMap.set(email, socket.id);
    socketidToEmailMap.set(socket.id, email);
    io.to(room).emit("user:joined", { email, id: socket.id });
    socket.join(room);
    io.to(socket.id).emit("room:join", data);
  });

  socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incomming:call", { from: socket.id, offer });
  });

  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    // console.log("peer:nego:needed", offer);
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    // console.log("peer:nego:done", ans);
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });


});


app.post("/chat", async (req, res) => {
  const { inputValue } = req.body;

  const completion = await openai.createCompletion({
    model: "text-davinci-003",
    max_tokens: 512,
    temperature: 0,
    prompt: `You are a medical advisor and will answer queries on the basis of health issues: ${inputValue}`,
  });
  res.send(completion.data.choices[0].text);
});

app.use("/api/users", users);
app.use("/api/password-reset", resetPasswordRoute);
app.use("/api/blogs", blogs);
app.use("/api/drugs", drugs);

app.use("/api/config/paypal", (req, res) => res.send(process.env.ClIENT_ID_PAYPAL));

app.get("/api/config/stripe", (req, res) => {
  res.send({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

app.post("/api/create-payment-intent", async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      currency: req.body.currency,
      amount: req.body.amount,
      automatic_payment_methods: { enabled: true },
    });

    // Send publishable key and PaymentIntent details to client
    res.send(paymentIntent.client_secret);
  } catch (e) {
    return res.status(400).send({
      error: {
        message: e.message,
      },
    });
  }
});

// deployment configuration
// const __dirname = path.resolve()

// if (process.env.NODE_ENV === 'production') {
//     app.use(express.static(path.join(__dirname, '/frontend/build')))

//     app.get('*', (req, res) =>
//         res.sendFile(path.resolve(__dirname, 'frontend', 'build', 'index.html'))
//     )
// }

server.listen(process.env.PORT, () =>
  console.log(`Listening on port ${process.env.PORT} ...`)
);
