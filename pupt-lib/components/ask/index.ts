// Export Ask namespace with all input components
import { AskText } from './Text';
import { AskNumber } from './Number';
import { AskSelect } from './Select';
import { AskConfirm } from './Confirm';
import { AskEditor } from './Editor';
import { AskMultiSelect } from './MultiSelect';
import { AskFile } from './File';
import { AskPath } from './Path';
import { AskDate } from './Date';
import { AskSecret } from './Secret';
import { AskChoice } from './Choice';
import { AskRating } from './Rating';
import { AskReviewFile } from './ReviewFile';
import { AskOption } from './Option';
import { AskLabel } from './Label';

// Create the Ask namespace object
export const Ask = {
  Text: AskText,
  Number: AskNumber,
  Select: AskSelect,
  Confirm: AskConfirm,
  Editor: AskEditor,
  MultiSelect: AskMultiSelect,
  File: AskFile,
  Path: AskPath,
  Date: AskDate,
  Secret: AskSecret,
  Choice: AskChoice,
  Rating: AskRating,
  ReviewFile: AskReviewFile,
  Option: AskOption,
  Label: AskLabel,
};

// Export individual components for tree shaking
export {
  AskText,
  AskNumber,
  AskSelect,
  AskConfirm,
  AskEditor,
  AskMultiSelect,
  AskFile,
  AskPath,
  AskDate,
  AskSecret,
  AskChoice,
  AskRating,
  AskReviewFile,
  AskOption,
  AskLabel,
};
