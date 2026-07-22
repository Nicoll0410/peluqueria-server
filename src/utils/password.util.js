import bcrypt from "bcrypt"

class PasswordUtils {
    async encrypt(password) {
        const encrypted = await bcrypt.hash(password, 13)
        return encrypted;
    }

    async isValidPassword(plainPassword, password) {
        const esCorrecta = await bcrypt.compare(plainPassword, password)
        return esCorrecta
    }
}

export const passwordUtils = new PasswordUtils()