// Export Ask namespace with all input components
import { AskChoice } from './Choice';
import { AskConfirm } from './Confirm';
import { AskDate } from './Date';
import { AskEditor } from './Editor';
import { AskFile } from './File';
import { AskLabel } from './Label';
import { AskMultiSelect } from './MultiSelect';
import { AskNumber } from './Number';
import { AskOption } from './Option';
import { AskPath } from './Path';
import { AskRating } from './Rating';
import { AskReviewFile } from './ReviewFile';
import { AskSecret } from './Secret';
import { AskSelect } from './Select';
import { AskText } from './Text';

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
  AskChoice,
  AskConfirm,
  AskDate,
  AskEditor,
  AskFile,
  AskLabel,
  AskMultiSelect,
  AskNumber,
  AskOption,
  AskPath,
  AskRating,
  AskReviewFile,
  AskSecret,
  AskSelect,
  AskText,
};
