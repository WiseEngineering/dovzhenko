export function hasEventMatch(
  subscriptionList: Array<any> | undefined,
  eventName: string | undefined,
): boolean {
  if (!subscriptionList) return true;

  if (!eventName && subscriptionList?.length) return true;

  return (
    subscriptionList.some(
      (pat) => (pat instanceof RegExp ? pat.test(eventName!) : pat === eventName),
    )
  );
}

export function removeArrayElement(arr: Array<any>, ids: Array<number>): Array<any> {
  return arr.filter((v, i) => !ids.find((id) => id === i));
}

export function splitter(str: string): Array<string> {
  return str.split('/').filter((val) => (val !== undefined ? val : false));
}
