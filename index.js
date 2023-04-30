import express from "express";
import "./db.config.js";
import report from "./helpers.js";
import { Parser } from "@json2csv/plainjs";

const app = express();

app.get("/get_report", async (req, res) => {
  const results = await report.getReport();
  if (results.length == 0) res.send("Report is not generated yet");
  else {
    const opts = {
      fields: ["store_id", "uptime_last_hour", "downtime_last_hour"],
    };
    const parser = new Parser(opts);
    const csv = parser.parse(results);
    res.setHeader("Content-disposition", "attachment; filename=data.csv");
    res.set("Content-Type", "text/csv");
    res.status(200).send(csv);
  }
});

app.post("/trigger-report", (req, res) => {
  report.generateReport();
  res.status(200).send("http://localhost:4000/get_report");
});

app.listen("4000", "127.0.0.1", () => {
  console.log("App is running on port : " + "4000");
});
