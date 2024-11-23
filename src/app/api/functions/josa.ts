export default function josa(str: string | undefined, whenTrue: string, whenFalse: string) {
  if (str) return (str.charCodeAt(str.length - 1) - '가'.charCodeAt(0)) % 28 > 0 ? str + whenTrue : str + whenFalse;
}
