/* The paper's typeface on screen: STIX Two, the serif made for scientific publishing, set as a journal sets a
   paper. */

import { STIX_Two_Text } from "next/font/google";

export const paperFont = STIX_Two_Text({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "600", "700"],
  variable: "--font-paper",
});
