import { Sequelize } from "sequelize";

const sequelize = new Sequelize({
  dialect: "mysql",
  host: "127.0.0.1",
  username: "root",
  password: '',
  database: "test",
});
try {
  await sequelize.authenticate();
  console.log("Connection is established!");
} catch (error) {
  console.log(error);
}

export default sequelize;