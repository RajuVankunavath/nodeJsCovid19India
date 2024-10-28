const express = require("express");
const { open } = require("sqlite");
const path = require("path");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");

let db = null;
const connectDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DataBase Error ${e.message}`);
    process.exit(1);
  }
};

connectDbAndServer();

// GET API

const convertStateResponse = (data) => {
  return {
    stateId: data.state_id,
    stateName: data.state_name,
    population: data.population,
  };
};

app.get("/states/", async (request, response) => {
  const getStateDetails = `
    SELECT 
    * 
    FROM state 
    ;`;
  const Data = await db.all(getStateDetails);
  response.send(Data.map((data) => convertStateResponse(data)));
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;

  const getDetailsOfState = `
    SELECT 
    * 
    FROM state 
    WHERE state_id = ${stateId}
    ;`;

  const Data = await db.get(getDetailsOfState);
  response.send(convertStateResponse(Data));
});

const convertDistrictNames = (data) => {
  return {
    districtId: data.district_id,
    districtName: data.district_name,

    stateId: data.state_id,
    cases: data.cases,
    cured: data.cured,
    active: data.active,
    deaths: data.deaths,
  };
};

// post API

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateQuery = `
      INSERT INTO
      district(state_id,district_name,cases,cured,active,deaths)
      VALUES(
           ${stateId},
          '${districtName}',
          ${cases},
          ${cured},
          ${active},
          ${deaths}
      )
      ;`;

  await db.run(updateQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDetails = `
    SELECT
    *
    FROM district 
    WHERE district_id=${districtId};`;

  const districtData = await db.get(getDetails);
  console.log(districtData);
  response.send(convertDistrictNames(districtData));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrict = `
    DELETE FROM district 
    WHERE district_id = ${districtId};`;
  await db.run(deleteDistrict);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;

  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const updateQuery = `
    UPDATE 
    district
    SET 
        district_name = '${districtName}',
        state_id= ${stateId},
        cases = ${cases},
        cured = ${cured},
        active = ${active},
        deaths= ${deaths} 
    WHERE district_id= ${districtId}
    ;`;

  await db.run(updateQuery);
  response.send("District Details Updated");
});

app.get("/districts/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const { cases, cured, active, deaths } = request.body;
  const getDetails = `
    SELECT 
        SUM( cases),
        SUM(cured),
        SUM(active),
        SUM(deaths) 
    FROM district
    WHERE state_id=${stateId}
    ;`;

  const data = await db.get(getDetails);
  console.log(data);
  response.send({
    totalCases: data["SUM(cases)"],
    totalCured: data["SUM(cured)"],
    totalActive: data["SUM(active)"],
    totalDeaths: data["SUM(deaths)"],
  });
});

app.get("/district/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getQuery = `
    SELECT 
    state_id
    FROM district 
    WHERE district_id=${districtId}
    ;`;
  const data = await db.get(getQuery);
  const getStateQuery = `SELECT state_name as stateName FROM state
    WHERE state_id=${data.state_id};`;
  const getStateNameQueryResponse = await db.get(getStateQuery);
  response.send(getStateNameQueryResponse);
});

module.exports = app;
