const axios = require('axios');
const apiKey = 
axios.post("https://api.addis.ai/v1/audio", { text: "ሰላም", language: "am" }, { headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" } })
  .then(res => console.log("SUCCESS:", res.status))
  .catch(err => console.log("ERROR:", err.response ? err.response.status + " " + err.response.statusText : err.message, err.response?.data?.toString ? err.response.data.toString() : err.response?.data));
