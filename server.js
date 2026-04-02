const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
app.use(express.text({ limit: "50mb" }));

app.post("/deobf", async (req, res) => {
  try {
    let code;
    if (req.query.file) {
      const filePath = path.resolve(req.query.file);
      if (!fs.existsSync(filePath)) return res.status(400).send("File not found");
      code = fs.readFileSync(filePath, "utf-8");
    } else {
      code = req.body;
      if (!code) return res.status(400).send("No code provided");
    }

    let payload = { filename: "input.lua", source: code, lua_version: "Lua51", pretty: true };
    let r = await fetch("https://relua.lua.cz/deobfuscate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    let data = await r.json();

    if (!data.ok) {
      payload.lua_version = "LuaU";
      r = await fetch("https://relua.lua.cz/deobfuscate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      data = await r.json();
      if (!data.ok) throw new Error(data.error || "Deobfuscation failed");
    }

    const watermark = "--[[ 45ms deobf written in lua - 45ms.netlify.app ]]\t";
    const renameRes = await fetch("https://renamer-rd14.onrender.com/api", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: watermark + data.output.replace(/\r?\n/g, "\n\t")
    });

    const renamedCode = await renameRes.text();
    res.setHeader("Content-Type", "text/plain");
    res.send(renamedCode);
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
