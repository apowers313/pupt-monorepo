// Register all built-in components and re-export them

import { defaultRegistry } from '../services/component-registry';

// Structural components
import {
  Prompt,
  Section,
  Role,
  Task,
  Context,
  Constraint,
  Format,
  Audience,
  Tone,
  SuccessCriteria,
  Criterion,
} from './structural';

// Utility components
import {
  UUID,
  Timestamp,
  DateTime,
  Hostname,
  Username,
  Cwd,
} from './utility';

// Meta components
import { Uses } from './meta';

// Ask components
import {
  AskOption,
  AskLabel,
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
} from './ask';

// Control flow components
import { If } from './control/If';
import { ForEach } from './control/ForEach';

// Examples components
import { Example, Examples, ExampleInput, ExampleOutput } from './examples';

// Reasoning components
import { Steps, Step } from './reasoning';

// Data components
import { Code, Data, File, Json, Xml } from './data';

// Post-execution components
import { PostExecution, ReviewFile, OpenUrl, RunCommand } from './post-execution';

// Register all structural components
defaultRegistry.register('Prompt', Prompt);
defaultRegistry.register('Section', Section);
defaultRegistry.register('Role', Role);
defaultRegistry.register('Task', Task);
defaultRegistry.register('Context', Context);
defaultRegistry.register('Constraint', Constraint);
defaultRegistry.register('Format', Format);
defaultRegistry.register('Audience', Audience);
defaultRegistry.register('Tone', Tone);
defaultRegistry.register('SuccessCriteria', SuccessCriteria);
defaultRegistry.register('Criterion', Criterion);

// Register all utility components
defaultRegistry.register('UUID', UUID);
defaultRegistry.register('Timestamp', Timestamp);
defaultRegistry.register('DateTime', DateTime);
defaultRegistry.register('Hostname', Hostname);
defaultRegistry.register('Username', Username);
defaultRegistry.register('Cwd', Cwd);

// Register meta components
defaultRegistry.register('Uses', Uses);

// Register Ask components
defaultRegistry.register('AskText', AskText);
defaultRegistry.register('AskNumber', AskNumber);
defaultRegistry.register('AskSelect', AskSelect);
defaultRegistry.register('AskConfirm', AskConfirm);
defaultRegistry.register('AskOption', AskOption);
defaultRegistry.register('AskLabel', AskLabel);
defaultRegistry.register('AskEditor', AskEditor);
defaultRegistry.register('AskMultiSelect', AskMultiSelect);
defaultRegistry.register('AskFile', AskFile);
defaultRegistry.register('AskPath', AskPath);
defaultRegistry.register('AskDate', AskDate);
defaultRegistry.register('AskSecret', AskSecret);
defaultRegistry.register('AskChoice', AskChoice);
defaultRegistry.register('AskRating', AskRating);
defaultRegistry.register('AskReviewFile', AskReviewFile);

// Register control flow components
defaultRegistry.register('If', If);
defaultRegistry.register('ForEach', ForEach);

// Register examples components (using function names for registry lookup)
defaultRegistry.register('Example', Example);
defaultRegistry.register('ExampleInput', ExampleInput);
defaultRegistry.register('ExampleOutput', ExampleOutput);
defaultRegistry.register('Examples', Examples);

// Register reasoning components
defaultRegistry.register('Steps', Steps);
defaultRegistry.register('Step', Step);

// Register data components
defaultRegistry.register('Code', Code);
defaultRegistry.register('Data', Data);
defaultRegistry.register('File', File);
defaultRegistry.register('Json', Json);
defaultRegistry.register('Xml', Xml);

// Register post-execution components
defaultRegistry.register('PostExecution', PostExecution);
defaultRegistry.register('ReviewFile', ReviewFile);
defaultRegistry.register('OpenUrl', OpenUrl);
defaultRegistry.register('RunCommand', RunCommand);

// Re-export all components
export * from './structural';
export * from './utility';
export * from './meta';
// Re-export ask components with explicit names to avoid File conflict with data
export {
  Ask,
  AskOption,
  AskLabel,
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
} from './ask';
export { If } from './control/If';
export { ForEach } from './control/ForEach';
export * from './examples';
export * from './reasoning';
export * from './data';
export * from './post-execution';
