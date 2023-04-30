import { DataTypes } from "sequelize";
import sequelize from "./db.config.js";

const Store_Status = sequelize.define('store_status', {
    store_id: {
        type: DataTypes.STRING
    },
    status: {
        type: DataTypes.STRING
    },
    time1: {
        type: DataTypes.STRING
    }
})

const Menu_Hours = sequelize.define('menu_hours', {
    store_id: {
        type: DataTypes.STRING
    },
    start_time: {
        type: DataTypes.STRING
    },
    end_time: {
        type: DataTypes.STRING
    },
    day: {
        type: DataTypes.INTEGER
    }
})

const Store_TimeZones = sequelize.define('store_timezones', {
    store_id: {
        type: DataTypes.STRING
    },
    timezone: {
        type: DataTypes.STRING
    }
})

const MODELS = {
    Store_Status,
    Menu_Hours,
    Store_TimeZones
}

export default MODELS;