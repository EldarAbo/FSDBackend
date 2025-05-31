import subjectModel from "../models/subjectModel.js";

class SubjectController {
  constructor() {
    this.model = subjectModel;
  }

  async getById(req, res) {
    const id = req.params.id;
    try {
      const subject = await this.model.findById(id).populate("userId").populate("resultsId");
      if (subject) {
        res.status(200).send(subject);
      } else {
        res.status(404).send("Subject not found");
      }
    } catch (error) {
      res.status(400).send(error);
    }
  }

  async create(req, res) {
    try {
      const { title, description, userId, resultsId } = req.body;
      const subject = await this.model.create({ title, description, userId, resultsId });
      res.status(201).send(subject);
    } catch (error) {
      res.status(400).send(error);
    }
  }

  async updateItem(req, res) {
    const id = req.params.id;
    const body = req.body;
    try {
      const updatedSubject = await this.model.findByIdAndUpdate(id, body, { new: true });
      if (!updatedSubject) {
        res.status(404).send("Subject not found");
      } else {
        res.status(200).send(updatedSubject);
      }
    } catch (error) {
      res.status(400).send(error);
    }
  }

  async deleteItem(req, res) {
    const id = req.params.id;
    try {
      const deletedSubject = await this.model.findByIdAndDelete(id);
      if (!deletedSubject) {
        res.status(404).send("Subject not found");
      } else {
        res.status(200).send(deletedSubject);
      }
    } catch (error) {
      res.status(400).send(error);
    }
  }

  async getSubjectsByUserId(userId) {
    try {
      const subjects = await this.model.find({ userId });

      if (!subjects || subjects.length === 0) {
        return []; // מחזיר מערך ריק אם אין נושאים
      }

      const enrichedSubjects = await Promise.all(
        subjects.map(async (subject) => {
          let tests = 0;
          let summaries = 0;

          try {
            const contentCounts = await ContentModel.aggregate([
              {
                $match: {
                  userId,
                  subject: subject._id.toString(),
                  deleted: false,
                },
              },
              {
                $group: {
                  _id: "$contentType",
                  count: { $sum: 1 },
                },
              },
            ]);

            for (const c of contentCounts) {
              if (c._id === "Exam") tests = c.count;
              else if (c._id === "Summary") summaries = c.count;
            }
          } catch (err) {
            // במקרה של שגיאה באגרגציה, ממשיכים עם 0 ו-0
          }

          return {
            _id: subject._id,
            title: subject.title,
            description: subject.description,
            userId: subject.userId,
            tests: tests,
            summaries: summaries,
          };
        })
      );

      return enrichedSubjects;
    } catch (error) {
      console.error("Error in getSubjectsByUserId:", error);
      throw new Error("Error fetching subjects with test/summary counts");
    }
}


}

const subjectController = new SubjectController();
export default subjectController;