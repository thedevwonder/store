import moment from "moment";
import { DataTypes, QueryTypes } from "sequelize";
import sequelize from "./db.config.js";
import MODELS from "./models.js";

class Report {
  async getUpTimeLastHour(storeId) {
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

  async getAccuracyFactor(storeId, date) {
    try {
      const timezone = await sequelize.query(
        "select * from store_timezones where store_id = ?",
        {
          replacements: [storeId],
        }
      );
      const dayOfWeek = moment(date).day();
      const storeOnlineTime = await sequelize.query(
        "select * from menu_hours where store_id = ? and day = ?",
        {
          replacements: [storeId, dayOfWeek],
          type: QueryTypes.SELECT,
        }
      );
      const timeRange = [];
      let totalStoreOnlineTime = 0;
      if (storeOnlineTime.length > 0) {
        storeOnlineTime.forEach((data) => {
          let diff = moment(data.end_time, "HH:mm:ss").diff(
            moment(data.start_time, "HH:mm:ss"),
            "minutes"
          );
          totalStoreOnlineTime += diff;
          timeRange.push({
            startTime: moment(date + " " + data.start_time).format(
              "YYYY-MM-DD HH:mm:ss"
            ),
            endTime: moment(date + " " + data.end_time).format(
              "YYYY-MM-DD HH:mm:ss"
            ),
          });
        });
      } else {
        totalStoreOnlineTime = 24 * 60;
        timeRange.push({
          startTime: date + " " + "00:00:00",
          endTime: date + " " + "23:59:00",
        });
      }
      let actualStoreOnlineTime = 0;
      console.log(timeRange, "TIME RANGE");
      timeRange.forEach(async (data) => {
        const storeStatus = await sequelize.query(
          `select * from store_status where store_id = ? and CONVERT_TZ(time1, 'UTC', ?) >= ? and CONVERT_TZ(time1, 'UTC', ?) <= ?`,
          {
            replacements: [storeId, data.startTime, data.endTime],
            type: QueryTypes.SELECT,
          }
        );

        if (storeStatus.length > 0) {
          if (storeStatus[0].status == "active") {
            actualStoreOnlineTime += moment(storeStatus[0].time1).diff(
              moment(data.startTime),
              "minutes"
            );
          }
          for (let i = 0; i < storeStatus.length; i++) {
            if (
              storeStatus[i].status == "active" &&
              storeStatus[i + 1].status == "active"
            ) {
              actualStoreOnlineTime += moment(storeStatus[i + 1].time1).diff(
                moment(storeStatus[i].time1),
                "minutes"
              );
            }
          }
          if (storeStatus[storeStatus.length - 1].status == "active") {
            actualStoreOnlineTime += moment(data.endTime).diff(
              moment(storeStatus[storeStatus.length - 1].time1),
              "minutes"
            );
          }
        }
        console.log(storeStatus, "STORE STATUS");
      });

      let accuracyFactor = actualStoreOnlineTime / totalStoreOnlineTime;
      console.log(accuracyFactor);

      return accuracyFactor;
    } catch (error) {
      console.log(error);
    }
  }

  changeTimeZone(timeZone) {
    try {
      console.log(moment().tz(timeZone).format("YYYY-MM-DD HH:mm"));
      console.log(moment().clone().startOf("hour").format("YYYY-MM-DD HH:mm"));
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
          const { upTime, downTime } = await this.getUpTimeLastHour(
            data.store_id
          );
          await sequelize.query(
            "INSERT INTO store_results (store_id, uptime_last_hour, downtime_last_hour) values (?, ?, ?) ON DUPLICATE KEY UPDATE uptime_last_hour=VALUES(uptime_last_hour), downtime_last_hour=VALUES(downtime_last_hour)",
            {
              replacements: [data.store_id, upTime, downTime],
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
export default report;
