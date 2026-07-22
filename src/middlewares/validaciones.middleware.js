import { request, response } from "express"

class Validaciones {
    estaVacio(name, errorMensaje, opciones) {
        const { max = 255, esNumerico = false } = opciones ?? {}

        return (req = request, res = response, next) => {
            const field = req.body[name]
            if (!field) return res.status(400).json({ mensaje: errorMensaje })

            if (esNumerico && isNaN(field)) return res.status(400).json({ mensaje: `El campo ${name} debe ser numérico ` })
            if (max < String(field).length) return res.status(400).json({ mensaje: `El campo ${name} no puede tener más de ${max} caracteres` })

            next()
        }
    }

    esEmail(name, errorMensaje) {
        return (req = request, res = response, next) => {
            const email = req.body[name]
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!regex.test(email)) return res.status(400).json({ mensaje: errorMensaje })

            next()
        }
    }

    estaHeaderVacio(name, errorMensaje) {
        return (req = request, res = response, next) => {
            const field = req.header(name)
            if (!field) return res.status(400).json({ mensaje: errorMensaje })
            next()
        }
    }

}

export const validaciones = new Validaciones()