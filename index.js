import express from "express";
import hbs from "hbs";
import fetch from "node-fetch"; // Módulo para realizar solicitudes HTTP
import { v4 as uuidv4 } from "uuid"; // Módulo para generar identificadores únicos
import bodyParser from "body-parser";
import https from "https";
import { ActualizaCuentas } from "./utils/distribuirGastos.js";
import fs from "fs"; // Módulo para leer y escribir archivos
//recuperar ruta raiz
import { dirname } from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const app = express();
app.set("view engine", "hbs");
app.use(express.static("public"));
hbs.registerPartials(__dirname + "/views/partials");
// Middleware para analizar el cuerpo de la solicitud
app.use(bodyParser.json({limit: '25mb', extended: true}));
app.use(bodyParser.urlencoded({ limit: '25mb', extended: true}));
// Middleware para manejar el cuerpo de las peticiones en formato JSON
app.use(express.json()); 



app.get("/", (req, res) => {
  // Ruta para servir el archivo index.html
     res.render("index")
});

// aqui parte el codigo

async function obtenerRandomUser() {
  const res = await fetch("https://randomuser.me/api/");
  const data = await res.json();
  return data.results[0];
}

app.post("/roommate", async (req, res) => {
  // Ruta POST para agregar un nuevo roommate usando random user
  try {
    const randomUserData = await obtenerRandomUser();
    const roommate = {
      id: uuidv4(), // Generar un identificador único para el roommate
      nombre: randomUserData.name.first + " " + randomUserData.name.last,
      debe: 0,
      recibe: 0,
    };

    fs.readFile("data/roommates.json", "utf8", (err, data) => {
      if (err) {
        res
          .status(500)
          .json({ error: "Error al leer el archivo de roommates." });
      } else {
        const roommates = JSON.parse(data);
        roommates.push(roommate);

        fs.writeFile(
          "data/roommates.json",
          JSON.stringify(roommates),
          (err) => {
            if (err) {
              res
                .status(500)
                .json({ error: "Error al guardar el nuevo roommate." });
            } else {
              res
                .status(201)
                .json({ mensaje: "Nuevo roommate agregado exitosamente." });
              ActualizaCuentas();
            }
          }
        );
      }
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error al obtener los datos de random user." });
  }
});

app.get("/roommates", (req, res) => {
  // Ruta GET para obtener todos los roommates almacenados
  fs.readFile("data/roommates.json", "utf8", (err, data) => {
    if (err) {
      res.status(500).json({ error: "Error al leer el archivo de roommates." });
    } else {
      const roommates = JSON.parse(data);
      res.status(200).json({ roommates });
    }
  });
});

///--------------------- GASTOS  -----------------------------
// Ruta GET para obtener el historial de gastos registrados
app.get("/gastos", (req, res) => {
  fs.readFile("data/gastos.json", "utf8", (err, data) => {
    if (err) {
      res.status(500).json({ error: "Error al leer el archivo de gastos." });
    } else {
      const gastos = JSON.parse(data);
      res.status(200).json({ gastos });
    }
  });
});

// Ruta POST para agregar un nuevo gasto
app.post("/gasto", (req, res) => {
  const { roommate, descripcion, monto } = req.body;
  const gasto = {
    id: uuidv4(),
    roommate,
    descripcion,
    monto,
  };

  fs.readFile("data/gastos.json", "utf8", (err, data) => {
    if (err) {
      res.status(500).json({ error: "Error al leer el archivo de gastos." });
    } else {
      const gastos = JSON.parse(data);
      gastos.push(gasto);

      fs.writeFile("data/gastos.json", JSON.stringify(gastos), (err) => {
        if (err) {
          res.status(500).json({ error: "Error al guardar el nuevo gasto." });
        } else {
          res
            .status(201)
            .json({ mensaje: "Nuevo gasto agregado exitosamente." });
          ActualizaCuentas();
        }
      });
    }
  });
});

app.post("/gasto/:id", (req, res) => {
  const id = req.params.id; // Obtener el parámetro 'id' de la URL
  const { roommate, descripcion, monto } = req.body;

  console.log("Datos recibidos en la solicitud POST:");
  console.log("id:", id);
  console.log("roommate:", roommate);
  console.log("descripcion:", descripcion);
  console.log("monto:", monto);

  fs.readFile("data/gastos.json", "utf8", (err, data) => {
    if (err) {
      res.status(500).json({ error: "Error al leer el archivo de gastos." });
    } else {
      const gastos = JSON.parse(data);
      const gastoIndex = gastos.findIndex((g) => g.id === id);

      if (gastoIndex !== -1) {
        gastos[gastoIndex] = {
          id,
          roommate,
          descripcion,
          monto,
        };

        fs.writeFile("data/gastos.json", JSON.stringify(gastos), (err) => {
          if (err) {
            res
              .status(500)
              .json({ error: "Error al guardar los cambios del gasto." });
          } else {
            res
              .status(200)
              .json({ mensaje: "Gasto actualizado exitosamente." });
            ActualizaCuentas();
          }
        });
      } else {
        res.status(404).json({ error: "Gasto no encontrado." });
      }
    }
  });
});

// Ruta DELETE para eliminar un gasto del historial
app.delete("/gasto", (req, res) => {
  const { id } = req.query;

  fs.readFile("data/gastos.json", "utf8", (err, data) => {
    if (err) {
      res.status(500).json({ error: "Error al leer el archivo de gastos." });
    } else {
      const gastos = JSON.parse(data);
      const gastoIndex = gastos.findIndex((g) => g.id === id);

      if (gastoIndex !== -1) {
        gastos.splice(gastoIndex, 1);

        fs.writeFile("data/gastos.json", JSON.stringify(gastos), (err) => {
          if (err) {
            res.status(500).json({ error: "Error al eliminar el gasto." });
          } else {
            res.status(200).json({ mensaje: "Gasto eliminado exitosamente." });
            ActualizaCuentas();
          }
        });
      } else {
        res.status(404).json({ error: "Gasto no encontrado." });
      }
    }
  });
});

// aqui termina el codigo











 app.listen(3000, () => {
    console.log("Servidor en puerto http://localhost:3000");
 });

 

