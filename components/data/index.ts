import { cat2_3 } from "./cat2_3";
import { cat1_a } from "./cat1_a";
import { cat1_b } from "./cat1_b";
import { cat4_a } from "./cat4_a";
import { cat4_b } from "./cat4_b";
import { cat5_a } from "./cat5_a";
import { cat5_b } from "./cat5_b";
import { cat6_a } from "./cat6_a";
import { cat6_b } from "./cat6_b";

// Merge detailed category 1 chunks
const cat1 = {
  "شؤون الطلاب (السلوك والانضباط)": {
    ...cat1_a["شؤون الطلاب (السلوك والانضباط)"],
    ...cat1_b["شؤون الطلاب (السلوك والانضباط)"],
  }
};

const cat4 = {
  "أولياء الأمور والبيئة الأسرية": {
    ...cat4_a["أولياء الأمور والبيئة الأسرية"],
    ...cat4_b["أولياء الأمور والبيئة الأسرية"],
  }
};

const cat5 = {
  "المشكلات التقنية، المادية، والتخصصية": {
    ...cat5_a["المشكلات التقنية، المادية، والتخصصية"],
    ...cat5_b["المشكلات التقنية، المادية، والتخصصية"],
  }
};

const cat6 = {
  "الكادر التعليمي والإداري": {
    ...cat6_a["الكادر التعليمي والإداري"],
    ...cat6_b["الكادر التعليمي والإداري"],
  }
};

const oldIssuesDictionary = {};

export const issuesDictionary = {
  ...oldIssuesDictionary,
  ...cat1,
  ...cat2_3,
  ...cat4,
  ...cat5,
  ...cat6
};
