// Export Ask namespace with all input components
import { Text } from './Text';
import { Number } from './Number';
import { Select } from './Select';
import { Confirm } from './Confirm';
import { Editor } from './Editor';
import { MultiSelect } from './MultiSelect';
import { AskFile } from './File';
import { Path } from './Path';
import { AskDate } from './Date';
import { Secret } from './Secret';
import { Choice } from './Choice';
import { Rating } from './Rating';
import { AskReviewFile } from './ReviewFile';
import { Option } from './Option';
import { Label } from './Label';

export { Option, Label };

// Create the Ask namespace object
export const Ask = {
  Text,
  Number,
  Select,
  Confirm,
  Editor,
  MultiSelect,
  File: AskFile,
  Path,
  Date: AskDate,
  Secret,
  Choice,
  Rating,
  ReviewFile: AskReviewFile,
};

// Export individual components for tree shaking
export {
  Text,
  Number,
  Select,
  Confirm,
  Editor,
  MultiSelect,
  AskFile,
  Path,
  AskDate,
  Secret,
  Choice,
  Rating,
  AskReviewFile,
};
