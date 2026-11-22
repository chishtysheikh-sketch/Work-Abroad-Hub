// Rules for NEW passwords (sign-up, reset, change).
// validatePassword(pw, email) → "" when OK, otherwise a message for the user.

const COMMON = new Set(`
123456 123456789 12345678 1234567890 12345 1234567 password password1 password12 password123
qwerty qwerty12 qwerty123 qwerty1234 qwertyuiop 1q2w3e4r 1q2w3e4r5t 1qaz2wsx qazwsx qazwsx123
abc123 abcd1234 abc12345 a1b2c3d4 aa123456 asdf1234 asdfgh123 zxcvbnm1 zxcv1234 q1w2e3r4
iloveyou iloveyou1 iloveyou2 princess1 sunshine1 football1 baseball1 basketball1 soccer123
monkey123 dragon123 master123 shadow123 superman1 batman123 welcome1 welcome123 letmein1
login123 admin123 admin1234 administrator1 root1234 test1234 test12345 testing123 guest123
passw0rd p@ssw0rd p@ssword1 pass1234 pass12345 secret123 changeme1 hello123 hello1234
hellokitty1 starwars1 pokemon123 minecraft1 trustno1 whatever1 freedom1 computer1 internet1
samsung123 apple123 google123 naver123 kakao123 korea123 seoul123 busan123 love1234 lovely123
michael1 jessica1 charlie1 daniel123 jordan23 summer123 winter123 spring123 autumn123
000000a1 11111111a 111111a1 123123123 123123a 123qwe123 1234qwer 1234abcd 12341234a
a12345678 q12345678 zaq12wsx 7777777a 88888888a 99999999a 147258369 159753qwe 987654321a
`.split(/\s+/).filter(Boolean));

export function validatePassword(pw, email = "") {
  pw = String(pw || "");
  if (pw.length < 8 || pw.length > 72) return "Password must be 8–72 characters.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Password needs at least one letter and one number.";
  const name = String(email).split("@")[0].toLowerCase();
  if (name.length >= 3 && pw.toLowerCase().includes(name)) return "Password must not contain your email name.";
  if (COMMON.has(pw.toLowerCase())) return "This password is too common. Please choose another one.";
  return "";
}
