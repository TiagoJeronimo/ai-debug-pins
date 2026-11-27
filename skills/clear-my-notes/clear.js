// Deletes the notes marked done in .notes/ of the folder it is run in, and their pictures.
import { join } from 'node:path'
import { clearDone } from '../../notes.js'

const n = await clearDone(join(process.cwd(), '.notes'))
console.log(n ? `Cleared ${n} done note${n > 1 ? 's' : ''} and their pictures.` : 'No done notes to clear.')
