import { useLocalStorage } from "@/lib/store";

export type Letter = {
  id: string;
  subject: string;
  body: string;
  timestamp: number;
  read: boolean;
  stamp: string;
};

const SUBJECTS = [
  "Re: Your recent behavior",
  "Notice of audit",
  "Presidential blessing",
  "Cease and desist (informal)",
  "Tax invoice (please ignore)",
  "Request for explanation",
  "Citizenship reminder",
  "Important national matter",
  "Your activity has been logged",
  "Friendly warning",
];

const STAMPS = [
  "OFFICIAL",
  "URGENT",
  "CLASSIFIED",
  "NON-NEGOTIABLE",
  "PERSONAL",
  "DO NOT IGNORE",
];

const BODIES: ((u: string) => string)[] = [
  (u) => `Dear ${u},\n\nWe at the Office of the President have noticed that you have been existing. This is acceptable, for now.\n\nKeep doing what you are doing, but slightly less of it.\n\nWith vague affection,\nNattoun`,
  (u) => `${u},\n\nThe state has reviewed your file. There is no file. We are now creating one. Please do not move.\n\n— Office of Files`,
  (u) => `Citizen ${u},\n\nIt has come to our attention that you may, or may not, have been thinking about a thing. We do not appreciate this.\n\nPlease think about something else immediately.\n\n— Ministry of Acceptable Thoughts`,
  (u) => `Hello ${u},\n\nYour application for absolutely nothing has been approved. Congratulations. You will receive nothing within 6-8 business epochs.\n\n— Department of Approvals`,
  (u) => `${u},\n\nThe National Bank is fine. There is no need to ask. Stop asking.\n\n— Treasury`,
  (u) => `Dear ${u},\n\nA museum visitor said your username sounds "kind of mid". The President has chosen not to comment.\n\nDevelop a personality at your earliest convenience.\n\n— Cultural Affairs`,
  (u) => `${u},\n\nDue to budgetary reasons, we have replaced one of your Nattoun Coins with a smaller Nattoun Coin. You will not be able to tell the difference.\n\n— Treasury`,
  (u) => `Citizen ${u},\n\nThe Library has flagged you for "reading too fast". This is suspicious. We will be in touch.\n\n— Library Compliance Unit`,
  (u) => `Dear ${u},\n\nPresident Nattoun would like to remind you that the country is still doing very well. There is no reason to panic. There has never been a reason to panic. We have always been doing well.\n\n— Office of Reassurance`,
  (u) => `${u},\n\nWe are pleased to inform you that you have not been deported today. Excellent work.\n\nKeep it up.\n\n— Border Control`,
  (u) => `Citizen ${u},\n\nThe Court has reviewed your last verdict and we stand by it. Even the silly one.\n\n— Judicial Branch`,
  (u) => `Dear ${u},\n\nWe were going to send you a gift, but the budget went to a single dog biscuit. The President ate it.\n\nThank you for your understanding.\n\n— Gift Bureau`,
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateLetter(username: string): Letter {
  const u = username || "Citizen";
  const body = pick(BODIES)(u);
  return {
    id: Math.random().toString(36).slice(2, 10),
    subject: pick(SUBJECTS),
    body,
    timestamp: Date.now(),
    read: false,
    stamp: pick(STAMPS),
  };
}

export const useLetters = () => useLocalStorage<Letter[]>("ogs_inbox", []);
export const useLastLetterAt = () => useLocalStorage<number>("ogs_last_letter_at", 0);
