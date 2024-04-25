const { Pool } = require('pg');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT, // Cambiar puerto según corresponda en archivo .env
};

// Configuración de la conexión a la base de datos PostgreSQL
const pool = new Pool(config);

// Nombre de la tabla en la base de datos
let tabla = 'estudiantes';

const letras = /^[a-zA-Z]+$/;
const numeros = /^[0-9]+$/;
const rutificador = /^[0-9.,-kK]+$/;

// manejo del process.argv
const argumentos = process.argv.slice(2);

// posicion 0 funcion a usar
const funcion = argumentos[0];

// resto de posiciones los otros campos
const nombre = argumentos[1];
const rut = argumentos[2];
const curso = argumentos[3];
const nivel = argumentos[4];

console.log("****************************");
console.log("Funcion: " + funcion);
console.log("Nombre: " + nombre);
console.log("Rut: " + rut);
console.log("Curso: " + curso);
console.log("Nivel: " + nivel);
console.log("****************************");

// Ruta para obtener todos los estudiantes
const getEstudiantes = async () => {
    try {
        const res = await pool.query('SELECT * FROM ' + tabla);

        if (res.rows.length === 0) {
            console.log("Aun no hay datos en la tabla");
            return;
        }

        console.log("Registro actual: ", res.rows);
    } catch (error) {
        errores(error);
    }
};

// Ruta para obtener un estudiante por su rut
const consultaRut = async ({ rut }) => {
    try {

        if (!rut) {
            return console.log("Por favor, proporcione el rut");
        }

        if (rutificador.test(rut) && rut.length >= 9 && rut.length <= 12) {
            const consultaExistencia = await pool.query('SELECT * FROM estudiantes WHERE Rut = $1', [rut]);

            if (consultaExistencia.rows.length === 0) {
                console.log(`El registro con rut: ${rut} no existe`);
                return;
            }

            const res = await pool.query('SELECT * FROM estudiantes WHERE Rut = $1', [rut]);
            console.log(res.rows[0]);

        } else {
            return console.log("Ingrese un rut valido");
        }

    } catch (error) {
        errores(error);
    }
}

// Ruta para agregar un nuevo estudiante
const nuevoEstudiante = async ({ nombre, rut, curso, nivel }) => {
    try {

        if (!nombre || !rut || !curso || !nivel) {
            return console.log("Por favor, proporcione nombre, rut, curso y nivel.");
        }

        if (letras.test(nombre) && rutificador.test(rut) && letras.test(curso) && numeros.test(nivel)) {
            const res = await pool.query(
                'INSERT INTO estudiantes (nombre, rut, curso, nivel) VALUES ($1, $2, $3, $4) RETURNING *',
                [nombre, rut, curso, nivel]
            );
            console.log(`Estudiante ${nombre} agregado con exito`);
            console.log("Estudiante agregado: ", res.rows[0]);

        } else {
            return console.log("Debe ingresar datos validos");
        }

    } catch (error) {
        errores(error);
    }
}

// Ruta para actualizar los datos de un estudiante
const actualizarEstudiante = async ({ nombre, rut, curso, nivel }) => {
    try {

        if (!nombre || !rut || !curso || !nivel) {
            return console.log("Por favor, proporcione nombre, rut, curso y nivel.");
        }

        if (letras.test(nombre) && rutificador.test(rut) && letras.test(curso) && numeros.test(nivel)) {
            // Consultar si el estudiante existe
            const consultaExistencia = await pool.query('SELECT * FROM estudiantes WHERE Rut = $1', [rut]);

            if (consultaExistencia.rows.length === 0) {
                console.log(`El registro con rut: ${rut} no existe`);
                return;
            }

            // Actualizar el estudiante
            const res = await pool.query(
                'UPDATE estudiantes SET nombre = $1, curso = $2, nivel = $3 WHERE rut = $4 RETURNING *',
                [nombre, curso, nivel, rut]
            );
            console.log(`Estudiante ${nombre} editado con éxito`);
            console.log("Estudiante actualizado: ", res.rows[0]);

        } else {
            return console.log("Debe ingresar datos validos");
        }

    } catch (error) {
        errores(error);
    }
}

// Ruta para eliminar un estudiante por su rut
const eliminarEstudiante = async ({ rut }) => {
    try {

        if (!rut) {
            return console.log("Por favor, proporcione el rut");
        }

        if (rutificador.test(rut) && rut.length >= 9 && rut.length <= 12) {
            const consultaExistencia = await pool.query('SELECT * FROM estudiantes WHERE Rut = $1', [rut]);

            if (consultaExistencia.rows.length === 0) {
                console.log(`El registro con rut: ${rut} no existe`);
                return;
            }

            const res = await pool.query('DELETE FROM estudiantes WHERE rut = $1 RETURNING *',
                [rut]
            );
            console.log(`Registro de estudiante con rut: ${rut} eliminado`);
            console.log("Estudiante eliminado: ", res.rows[0]);

        } else {
            return console.log("Ingrese un rut valido");
        }

    } catch (error) {
        errores(error);
    }
}

(async () => {
    try {
        // recibir funciones y campos de la línea de comando
        switch (funcion) {
            case 'nuevo':
                await nuevoEstudiante({ nombre, rut, curso, nivel });
                break;
            case 'consulta':
                await getEstudiantes();
                break;
            case 'rut':
                await consultaRut({ rut });
                break;
            case 'editar':
                await actualizarEstudiante({ nombre, rut, curso, nivel });
                break;
            case 'eliminar':
                await eliminarEstudiante({ rut });
                break;
            default:
                console.log("Función: " + funcion + " no es válida");
                break;
        }
    } catch (error) {
        console.error("Error al ejecutar la operación:", error);
    } finally {
        // Cerrar el pool de conexiones
        pool.end();
    }
})();

// Función para manejar los errores de la base de datos
const errores = (error) => {
    let errorMessage;
    let status = 500; // Establecemos el estado por defecto a 500

    // Manejo de diferentes tipos de errores
    switch (error.code) {
        case '28P01':
            errorMessage = "La autenticación de la contraseña falló o no existe el usuario: " + config.user;
            status = 400;
            break;
        case '42P01':
            errorMessage = "No existe la tabla [" + tabla + "] consultada";
            status = 400;
            break;
        case '3D000':
            errorMessage = "La base de datos [" + config.database + "] no existe";
            status = 400;
            break;
        case 'ENOTFOUND':
            errorMessage = "Error en el valor usado como localhost: " + config.host;
            status = 500;
            break;
        case 'ECONNREFUSED':
            errorMessage = "Error en el puerto de conexión a la base de datos, usando: " + config.port;
            status = 500;
            break;
        default:
            errorMessage = "Error desconocido: " + error.message;
            break;
    }

    // Envío del mensaje de error
    console.error(errorMessage);

    // Retorno del estado y el mensaje de error
    return { status, error: errorMessage };
}