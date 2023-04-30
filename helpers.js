import moment from "moment";
import { DataTypes, QueryTypes } from "sequelize";
import sequelize from "./db.config.js";
import MODELS from "./models.js";

class Report {
  async getUpTimeLastHour(storeId, probability) {
    try {
      const till = moment().format("YYYY-MM-DD HH:mm");
      const from = moment().clone().startOf("hour").format("YYYY-MM-DD HH:mm");
      const diff = moment(till, "YYYY-MM-DD HH:mm").diff(
        moment(from, "YYYY-MM-DD HH:mm"),
        "minutes"
      );
      const lastHourData = await sequelize.query(
        "select * from store_status where store_id = ? and time1 >= ? and time1 <= ?",
        {
          replacements: [storeId, from, till],
          type: QueryTypes.SELECT,
        }
      );
      let upTime = 0;
      if (lastHourData.length > 0) {
        if (lastHourData[0].status == "active") {
          upTime += moment(lastHourData[0].time1).diff(moment(from), "minutes");
        }
        for (let i = 0; i < lastHourData.length - 1; i++) {
          if (
            lastHourData[i].status == "active" &&
            lastHourData[i + 1].status == "active"
          ) {
            upTime += moment(lastHourData[i + 1].time1).diff(
              moment(lastHourData[i].time1),
              "minutes"
            );
          }
        }
        if (lastHourData[lastHourData.length - 1].status == "active") {
          upTime += moment(till).diff(
            moment(lastHourData[lastHourData.length - 1].time1),
            "minutes"
          );
        }
      } else {
        upTime = diff * probability;
      }
      const result = {
        upTime,
        downTime: diff - upTime,
      };
      return result;
      console.log(result);
    } catch (error) {
      console.log(error);
    }
  }

  async getUpDateLastWeek(storeId, probability) {
    try {
      const till = moment()
        .endOf("week")
        .subtract(7, "days")
        .format("YYYY-MM-DD HH:mm");
      const from = moment()
        .startOf("week")
        .subtract(7, "days")
        .format("YYYY-MM-DD HH:mm");
      const diff = moment(till, "YYYY-MM-DD HH:mm").diff(
        moment(from, "YYYY-MM-DD HH:mm"),
        "hours"
      );
      const lastWeekData = await sequelize.query(
        "select * from store_status where store_id = ? and time1 >= ? and time1 <= ? order by time1",
        {
          replacements: [storeId, from, till],
          type: QueryTypes.SELECT,
        }
      );
      let upTime = 0;
      if (lastWeekData.length > 0) {
        if (lastWeekData[0].status == "active") {
          upTime += moment(lastWeekData[0].time1).diff(moment(from), "hours");
        }
        for (let i = 0; i < lastWeekData.length - 1; i++) {
          if (
            lastWeekData[i].status == "active" &&
            lastWeekData[i + 1].status == "active"
          ) {
            upTime += moment(lastWeekData[i + 1].time1).diff(
              moment(lastWeekData[i].time1),
              "minutes"
            );
          }
        }
        if (lastHourData[lastWeekData.length - 1].status == "active") {
          upTime += moment(till).diff(
            moment(lastWeekData[lastWeekData.length - 1].time1),
            "minutes"
          );
        }
        upTime = upTime / 60;
      } else {
        upTime = diff * probability;
      }
      const result = {
        upTime,
        downTime: diff - upTime,
      };
      return result;
    } catch (error) {
      console.log(error);
    }
  }

  async getProbability(storeId) {
    try {
      const [timezoneResponse] = await sequelize.query(
        "select * from store_timezones where store_id = ?",
        {
          replacements: [storeId],
        }
      );
      const timezone =
        timezoneResponse.length > 0
          ? timezoneResponse[0].timezone
          : "America/Chicago";

      const storeStatusData = await sequelize.query(
        `select * from store_status where store_id = ? ORDER BY time1`,
        {
          replacements: [storeId],
          type: QueryTypes.SELECT,
        }
      );
      let activeCount = 0;
      let totalCount = 0;
      for (let i = 0; i < storeStatusData.length; i++) {
        const convertedTime = moment(
          storeStatusData[i].time1,
          "YYYY-MM-DD HH:mm"
        )
          .tz(timezone)
          .format("YYYY-MM-DD HH:mm");
        const day = moment(convertedTime).isoWeek() - 1;
        const storeOpeningResponse = await sequelize.query(
          "select * from menu_hours where store_id = ? and day = ? and start_time <= ? and end_time >= ?",
          {
            replacements: [storeId, day, convertedTime, convertedTime],
            type: QueryTypes.SELECT,
          }
        );
        if (storeOpeningResponse.length > 0) {
          if (storeStatusData[i].status == "active") {
            activeCount++;
          }
          totalCount++;
        }
      }
      const probability = activeCount / totalCount;
      return probability;
    } catch (error) {
      console.log(error);
    }
  }

  async getStoreActiveTime(storeId, day) {
    try {
      const results = await sequelize.query(
        "select * from menu_hours where store_id = ? and day = ?",
        {
          replacements: [storeId, day],
          type: QueryTypes.SELECT,
        }
      );
      return results;
    } catch (error) {
      console.log(error);
    }
  }
  async getTimeZoneByStoreId(storeId) {
    try {
      const results = await sequelize.query(
        "select * from store_timezones where store_id = ?",
        {
          replacements: [storeId],
          type: QueryTypes.SELECT,
        }
      );
      if (results.length > 0) return results[0].timezone;
      return "America/Chicago";
    } catch (error) {
      console.log(error);
    }
  }
  async generateReport() {
    try {
      const storeArr = await sequelize.query(
        "select distinct store_id from store_timezones",
        {
          type: QueryTypes.SELECT,
        }
      );
      const insert = await sequelize.query(
        "insert into report (status) values (?)",
        {
          replacements: ["pending"],
        }
      );

      await Promise.all(
        storeArr.map(async (data) => {
          const probability = await this.getProbability(data.store_id);
          const lastHour = await this.getUpTimeLastHour(
            data.store_id,
            probability
          );
          const lasWeek = await this.getUpDateLastWeek(
            data.store_id,
            probability
          );
          await sequelize.query(
            "INSERT INTO store_results (store_id, uptime_last_hour, downtime_last_hour, update_last_week, downtime_last_week) values (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE uptime_last_hour=VALUES(uptime_last_hour), downtime_last_hour=VALUES(downtime_last_hour), update_last_week=VALUES(update_last_week), downtime_last_week=VALUES(downtime_last_week)",
            {
              replacements: [
                data.store_id,
                lastHour.upTime,
                lastHour.downTime,
                lasWeek.upTime,
                lasWeek.downTime,
              ],
              type: QueryTypes.INSERT,
            }
          );
        })
      );
      await sequelize.query("update report set status = ? where id = ?", {
        replacements: ["completed", insert[0]],
        type: QueryTypes.UPDATE,
      });
    } catch (error) {
      console.log(error);
    }
  }
  async getReport() {
    try {
      const status = await sequelize.query(
        "select * from report SORT BY DESC LIMIT 1"
      );
      if (status[0].status == "pending") return [];
      if (status[0].status == "completed") {
        const results = await sequelize.query("select * from store_results");
        return results;
      }
      return [];
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

const report = new Report();
await report.generateReport("1481966498820158979");
export default report;
