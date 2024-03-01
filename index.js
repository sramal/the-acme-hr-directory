// express related packages and constants
const express = require("express");
const app = express();
app.use(require("morgan")("dev"));
app.use(express.json());

const PORT = process.env.PORT || 3000;

// postgress related packages and constants
const pg = require("pg");
const client = new pg.Client(
    process.env.DATABASE_URL || "postgres://localhost/acme_hr_directory"
);

const departments = [
    { department: "Engineering" },
    { department: "Research and Development" },
    { department: "Accounting" },
    { department: "Support" },
    { department: "Training" },
    { department: "Product Management" },
    { department: "Human Resources" },
    { department: "Sales" },
];

const employees = [
    { name: "Willem Huntingdon", department: "Training" },
    { name: "Hallsy Sotheby", department: "Product Management" },
    { name: "Chandler Tomlinson", department: "Human Resources" },
    { name: "Winne Paulo", department: "Sales" },
    { name: "Tybie Cuff", department: "Accounting" },
];

// routes
app.get("/api/error", (req, res, next) => {
    try {
        res.status(500).json({ error: 500, message: "Something went wrong." });
    } catch (error) {
        next(error);
    }
});

app.get("/api/employees", async (req, res, next) => {
    try {
        const response = await client.query("SELECT * FROM employees;");
        res.send(response.rows);
    } catch (error) {
        next(error);
    }
});

app.get("/api/departments", async (req, res, next) => {
    try {
        const response = await client.query("SELECT * FROM departments;");
        res.send(response.rows);
    } catch (error) {
        next(error);
    }
});

app.post("/api/employees", async (req, res, next) => {
    try {
        const SQL = `INSERT INTO employees(name, department_id) VALUES($1, (SELECT id FROM departments WHERE name = $2));`;
        const response = await client.query(SQL, [
            req.body.name,
            req.body.department,
        ]);
        res.send(response.rows[0]);
    } catch (error) {
        next(error);
    }
});

app.delete("/api/employees/:id", async (req, res, next) => {
    try {
        const SQL = `DELETE FROM employees where id = $1;`;
        const response = await client.query(SQL, [req.params.id]);
        res.send(response.rows[0]);
    } catch (error) {
        next(error);
    }
});

app.put("/api/employees/:id", async (req, res, next) => {
    try {
        let SQL = "UPDATE employees SET ";
        let params = [];
        if (req.body.name) {
            SQL += "name = $1 ";
            params.push(req.body.name);
        }

        if (req.body.department) {
            params.push(req.body.department);
            if (req.body.name) {
                SQL +=
                    ", department_id = (SELECT id FROM departments WHERE name = $2) WHERE id = $3";
            } else {
                SQL +=
                    "department_id = (SELECT id FROM departments WHERE name = $1) WHERE id = $2";
            }
        } else {
            SQL += "WHERE id = $2";
        }

        params.push(req.params.id);

        console.log(SQL);
        const response = await client.query(SQL, params);
        res.send(response.rows[0]);
    } catch (error) {
        next(error);
    }
});

const init = async () => {
    await client.connect();

    // Seeded database
    let SQL = `
        DROP TABLE IF EXISTS employees;
        DROP TABLE IF EXISTS department;
        DROP TABLE IF EXISTS departments;
        CREATE TABLE departments(id SERIAL PRIMARY KEY,
                                name VARCHAR(255) NOT NULL);
        CREATE TABLE employees(id SERIAL PRIMARY KEY,
                              name VARCHAR(255) NOT NULL,
                              created_at TIMESTAMP DEFAULT now(),
                              updated_at TIMESTAMP DEFAULT now(),
                              department_id INTEGER REFERENCES departments(id) NOT NULL);
    `;

    const departmentsSQL = departments
        .map(
            (item) =>
                `INSERT INTO departments(name) VALUES('${item.department}')`
        )
        .join(";");

    const employeesSQL = employees
        .map(
            (item) =>
                `INSERT INTO employees(name, department_id) VALUES('${item.name}', (SELECT id FROM departments WHERE name = '${item.department}'))`
        )
        .join(";");

    SQL += departmentsSQL + ";" + employeesSQL + ";";

    await client.query(SQL);
    console.log("Database seeded");

    app.listen(PORT, () => {
        console.log(`Server started and listening in on ${PORT}`);
    });
};

init();
