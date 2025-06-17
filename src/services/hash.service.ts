import bcrypt from "bcrypt";
export const HashService = {
  hash(pw: string) {
    return bcrypt.hash(pw, 12);
  },
  compare(pw: string, hash: string) {
    return bcrypt.compare(pw, hash);
  },
};
