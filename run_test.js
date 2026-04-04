
const jwt = require("jsonwebtoken");
const axios = require("axios");

async function test() {
  const token = jwt.sign({ id: "66fc5a2a1c2d3e4f5a6b7c8d", role: "ADMIN" }, "supersecretkey123", { expiresIn: "10h" });
  try {
    const res = await axios.post("http://localhost:5000/api/lessons", {
      topicId: "66fc5a2a1c2d3e4f5a6b7c8d",
      order: 1,
      title: "Test Lesson",
      vocabulary: [{ am: "ሰላም", ao: "Nagaa" }]
    }, {
      headers: { Authorization: "Bearer " + token }
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
test();

