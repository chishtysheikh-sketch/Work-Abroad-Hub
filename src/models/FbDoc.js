import mongoose from "mongoose";
const { Schema } = mongoose;

// One MongoDB document = one "Firestore-style" document of the website.
// col   = collection path, e.g. "postings" or "chats/<chatId>/messages"
// docId = the document id inside that collection
// data  = the document's fields (any shape the website saves)
const fbDocSchema = new Schema({
  col:   { type: String, required: true },
  docId: { type: String, required: true },
  data:  { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true, minimize: false });

fbDocSchema.index({ col: 1, docId: 1 }, { unique: true });
// P10: filter + sort in ONE index (runQuery always sorts by …, docId) → no in-memory sort.
//   applications / chats by member: where(studentUid|employerUid ==) · messages: orderBy("at")
fbDocSchema.index({ col: 1, "data.studentUid": 1, docId: 1 });
fbDocSchema.index({ col: 1, "data.employerUid": 1, docId: 1 });
fbDocSchema.index({ col: 1, "data.at": 1, docId: 1 });

export default mongoose.model("FbDoc", fbDocSchema);
