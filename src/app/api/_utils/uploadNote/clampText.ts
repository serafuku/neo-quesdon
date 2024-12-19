export function clampText(text: string, max_len: number, mandatoryTailString?: string, moreString?: string) {
  const mandatoryLen = mandatoryTailString?.length ?? 0;
  const textLen = text.length;
  const moreStringLen = moreString?.length ?? 0;
  if (textLen + mandatoryLen > max_len) {
    if (mandatoryLen + moreStringLen > max_len) {
      console.error(`Text length error! moreStringLen + moreStringLen > ${max_len}`);
      throw new Error(`Text length error! moreStringLen + moreStringLen > ${max_len}`);
    }
    const newText =
      text.substring(0, max_len - (mandatoryLen + moreStringLen)) + (moreString ?? '') + (mandatoryTailString ?? '');
    return newText;
  } else {
    const newText = text + mandatoryTailString;
    return newText;
  }
}
