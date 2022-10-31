import db from "../models/index";
import _, { reject } from "lodash";
import e from "express";
require("dotenv").config();

const MAX_NUMBER_SCHEDULE = process.env.MAX_NUMBER_SCHEDULE;

const getTopDoctorService = (limit) => {
  return new Promise(async (resolve, reject) => {
    try {
      let users = await db.User.findAll({
        limit: limit,
        where: { roleId: "R2" },
        order: [["createdAt", "DESC"]],
        attributes: {
          exclude: ["password"],
        },
        include: [
          {
            model: db.Allcode,
            as: "positionData",
            attributes: ["valueVi", "valueEn"],
          },
          {
            model: db.Allcode,
            as: "genderData",
            attributes: ["valueVi", "valueEn"],
          },
        ],
        raw: true,
        nest: true,
      });

      resolve({
        errCode: 0,
        data: users,
      });
    } catch (e) {
      reject(e);
    }
  });
};

const getAllDoctorsService = () => {
  return new Promise(async (resolve, reject) => {
    try {
      let doctocs = await db.User.findAll({
        where: { roleId: "R2" },
        attributes: {
          exclude: ["password", "image"],
        },
      });
      resolve({ errCode: 0, data: doctocs });
    } catch (e) {
      reject(e);
    }
  });
};

const saveInfoDoctorService = (inputData) => {
  return new Promise(async (resolve, reject) => {
    try {
      // let arrRequired = [
      //   "contentHTML",
      //   "contentMarkdown",
      //   "description",
      //   "doctorId",
      //   "priceId",
      //   "paymentId",
      //   "proviceId",
      //   "nameClinic",
      //   "addressClinic",
      //   "note",
      // ];
      if (
        !inputData.doctorId ||
        !inputData.contentHTML ||
        !inputData.contentMarkdown ||
        !inputData.description ||
        !inputData.priceId ||
        !inputData.paymentId ||
        !inputData.proviceId ||
        !inputData.nameClinic ||
        !inputData.addressClinic ||
        !inputData.note
      ) {
        resolve({ errCode: 1, errMessage: "Missing required parameter !!" });
      } else {
        let doctor = await db.Markdown.findOne({
          where: { doctorId: inputData.doctorId },
          raw: false,
        });
        //markdown
        if (!doctor) {
          await db.Markdown.create({
            contentHTML: inputData.contentHTML,
            contentMarkdown: inputData.contentMarkdown,
            description: inputData.description,
            doctorId: inputData.doctorId,
          });
        } else {
          (doctor.contentHTML = inputData.contentHTML),
            (doctor.contentMarkdown = inputData.contentMarkdown),
            (doctor.description = inputData.description),
            await doctor.save();
        }
        //info-doctor
        let infoDoctor = await db.Doctor_info.findOne({
          where: { doctorId: inputData.doctorId },
          raw: false,
        });
        if (!infoDoctor) {
          //create
          await db.Doctor_info.create({
            doctorId: inputData.doctorId,
            priceId: inputData.priceId,
            paymentId: inputData.paymentId,
            proviceId: inputData.proviceId,
            nameClinic: inputData.nameClinic,
            addressClinic: inputData.addressClinic,
            note: inputData.note,
          });
        } else {
          //update
          (infoDoctor.priceId = inputData.priceId),
            (infoDoctor.paymentId = inputData.paymentId),
            (infoDoctor.proviceId = inputData.proviceId),
            (infoDoctor.nameClinic = inputData.nameClinic),
            (infoDoctor.addressClinic = inputData.addressClinic),
            (infoDoctor.note = inputData.note),
            await infoDoctor.save();
        }
        resolve({
          errCode: 0,
          message: "Create user successed !!",
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

const getInfoDoctorService = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!id) {
        resolve({
          errCode: 1,
          message: "Missing required parameter !!",
        });
      } else {
        let data = await db.User.findOne({
          where: { id: id },
          attributes: {
            exclude: ["password"],
          },
          include: [
            {
              model: db.Allcode,
              as: "positionData",
              attributes: ["valueVi", "valueEn"],
            },
            {
              model: db.Markdown,
              attributes: ["description", "contentMarkdown", "contentHTML"],
            },
          ],
          raw: false,
          nest: true,
        });

        if (data && data.image) {
          data.image = new Buffer(data.image, "base64").toString("binary");
        }
        if (!data) data = {};

        resolve({
          errCode: 0,
          data: data,
        });
      }
    } catch (e) {
      console.log(e);
      reject(e);
    }
  });
};

const saveCreateScheduleService = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.arrSchedule || !data.doctorId || !data.formatDate) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameters !!",
        });
      } else {
        let schedule = data.arrSchedule;
        if (schedule && schedule.length > 0) {
          schedule = schedule.map((item) => {
            item.maxNumber = MAX_NUMBER_SCHEDULE;
            return item;
          });
        }

        let isExits = await db.Schedule.findAll({
          where: { doctorId: data.doctorId, date: data.formatDate },
          attributes: ["timeType", "date", "maxNumber", "doctorId"],
        });

        // if (isExits && isExits.length > 0) {
        //   isExits = isExits.map((item) => {
        //     item.date = new Date(item.date).getTime();
        //     return item;
        //   });
        // }

        let toCreate = _.differenceWith(schedule, isExits, (a, b) => {
          return a.timeType === b.timeType && +a.date === +b.date;
        });

        if (toCreate && toCreate.length > 0) {
          await db.Schedule.bulkCreate(toCreate);
        }

        resolve({
          errCode: 0,
          message: "OK!!",
        });
      }
    } catch (e) {
      console.log(e);
      reject(e);
    }
  });
};

const getScheduleDoctorService = (doctorId, date) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!doctorId || !date) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameters !!",
        });
      } else {
        let data = await db.Schedule.findAll({
          where: {
            doctorId: doctorId,
            date: date,
          },
          include: [
            {
              model: db.Allcode,
              as: "timeTypeData",
              attributes: ["valueVi", "valueEn"],
            },
          ],
          raw: false,
          nest: true,
        });
        if (!data) {
          data = [];
        }
        resolve({
          errCode: 0,
          data: data,
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

module.exports = {
  getTopDoctorService,
  getAllDoctorsService,
  saveInfoDoctorService,
  getInfoDoctorService,
  saveCreateScheduleService,
  getScheduleDoctorService,
};