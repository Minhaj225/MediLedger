const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MediLedger", function () {
  let mediLedger;
  let owner;
  let hospital;
  let patient;
  let doctor;
  let otherUser;

  beforeEach(async function () {
    [owner, hospital, patient, doctor, otherUser] = await ethers.getSigners();

    const MediLedger = await ethers.getContractFactory("MediLedger");
    mediLedger = await MediLedger.deploy();
    await mediLedger.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the deployer as owner", async function () {
      expect(await mediLedger.owner()).to.equal(owner.address);
    });
  });

  describe("Hospital Registration", function () {
    it("should allow owner to register a hospital", async function () {
      await expect(
        mediLedger.registerHospital(hospital.address, "City Hospital", "New York")
      )
        .to.emit(mediLedger, "HospitalRegistered")
        .withArgs(hospital.address, "City Hospital");

      const hospitalData = await mediLedger.getHospital(hospital.address);
      expect(hospitalData.name).to.equal("City Hospital");
      expect(hospitalData.location).to.equal("New York");
      expect(hospitalData.isRegistered).to.be.true;
    });

    it("should reject registration from non-owner", async function () {
      await expect(
        mediLedger
          .connect(otherUser)
          .registerHospital(hospital.address, "City Hospital", "New York")
      ).to.be.revertedWith("Only owner can perform this action");
    });

    it("should reject duplicate hospital registration", async function () {
      await mediLedger.registerHospital(hospital.address, "City Hospital", "New York");
      await expect(
        mediLedger.registerHospital(hospital.address, "City Hospital", "New York")
      ).to.be.revertedWith("Hospital already registered");
    });

    it("should reject registration with zero address", async function () {
      await expect(
        mediLedger.registerHospital(ethers.ZeroAddress, "City Hospital", "New York")
      ).to.be.revertedWith("Invalid hospital address");
    });
  });

  describe("Medical Records", function () {
    beforeEach(async function () {
      await mediLedger.registerHospital(hospital.address, "City Hospital", "New York");
    });

    it("should allow registered hospital to add a medical record", async function () {
      await expect(
        mediLedger
          .connect(hospital)
          .addMedicalRecord(
            patient.address,
            "QmTestHash123",
            "Lab Report",
            "Blood test results"
          )
      )
        .to.emit(mediLedger, "RecordAdded")
        .withArgs(1, patient.address, hospital.address);

      const recordCount = await mediLedger.getRecordCount(patient.address);
      expect(recordCount).to.equal(1);
    });

    it("should reject record addition from non-hospital", async function () {
      await expect(
        mediLedger
          .connect(otherUser)
          .addMedicalRecord(
            patient.address,
            "QmTestHash123",
            "Lab Report",
            "Blood test results"
          )
      ).to.be.revertedWith("Only registered hospitals can perform this action");
    });

    it("should reject record with empty IPFS hash", async function () {
      await expect(
        mediLedger
          .connect(hospital)
          .addMedicalRecord(patient.address, "", "Lab Report", "Blood test results")
      ).to.be.revertedWith("IPFS hash cannot be empty");
    });

    it("should reject record with zero patient address", async function () {
      await expect(
        mediLedger
          .connect(hospital)
          .addMedicalRecord(
            ethers.ZeroAddress,
            "QmTestHash123",
            "Lab Report",
            "Blood test results"
          )
      ).to.be.revertedWith("Invalid patient address");
    });

    it("should allow adding multiple records for same patient", async function () {
      await mediLedger
        .connect(hospital)
        .addMedicalRecord(
          patient.address,
          "QmTestHash1",
          "Lab Report",
          "Blood test"
        );
      await mediLedger
        .connect(hospital)
        .addMedicalRecord(
          patient.address,
          "QmTestHash2",
          "X-Ray",
          "Chest X-Ray"
        );

      const recordCount = await mediLedger.getRecordCount(patient.address);
      expect(recordCount).to.equal(2);
    });
  });

  describe("Access Control", function () {
    it("should allow patient to grant access to a doctor", async function () {
      await expect(mediLedger.connect(patient).grantAccess(doctor.address))
        .to.emit(mediLedger, "AccessGranted")
        .withArgs(patient.address, doctor.address);

      const hasAccess = await mediLedger.checkAccess(
        patient.address,
        doctor.address
      );
      expect(hasAccess).to.be.true;
    });

    it("should reject granting access to zero address", async function () {
      await expect(
        mediLedger.connect(patient).grantAccess(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid doctor address");
    });

    it("should reject duplicate access grant", async function () {
      await mediLedger.connect(patient).grantAccess(doctor.address);
      await expect(
        mediLedger.connect(patient).grantAccess(doctor.address)
      ).to.be.revertedWith("Access already granted");
    });

    it("should allow patient to revoke access", async function () {
      await mediLedger.connect(patient).grantAccess(doctor.address);
      await expect(mediLedger.connect(patient).revokeAccess(doctor.address))
        .to.emit(mediLedger, "AccessRevoked")
        .withArgs(patient.address, doctor.address);

      const hasAccess = await mediLedger.checkAccess(
        patient.address,
        doctor.address
      );
      expect(hasAccess).to.be.false;
    });

    it("should reject revoking access not previously granted", async function () {
      await expect(
        mediLedger.connect(patient).revokeAccess(doctor.address)
      ).to.be.revertedWith("Access not granted");
    });
  });

  describe("Record Viewing", function () {
    beforeEach(async function () {
      await mediLedger.registerHospital(hospital.address, "City Hospital", "New York");
      await mediLedger
        .connect(hospital)
        .addMedicalRecord(
          patient.address,
          "QmTestHash123",
          "Lab Report",
          "Blood test results"
        );
    });

    it("should allow patient to view their own records", async function () {
      const records = await mediLedger
        .connect(patient)
        .getPatientRecords(patient.address);
      expect(records.length).to.equal(1);
      expect(records[0].ipfsHash).to.equal("QmTestHash123");
      expect(records[0].recordType).to.equal("Lab Report");
      expect(records[0].description).to.equal("Blood test results");
      expect(records[0].hospital).to.equal(hospital.address);
    });

    it("should allow authorized doctor to view records", async function () {
      await mediLedger.connect(patient).grantAccess(doctor.address);
      const records = await mediLedger
        .connect(doctor)
        .getPatientRecords(patient.address);
      expect(records.length).to.equal(1);
      expect(records[0].ipfsHash).to.equal("QmTestHash123");
    });

    it("should allow hospital that uploaded records to view them", async function () {
      const records = await mediLedger
        .connect(hospital)
        .getPatientRecords(patient.address);
      expect(records.length).to.equal(1);
    });

    it("should reject unauthorized access to records", async function () {
      await expect(
        mediLedger.connect(otherUser).getPatientRecords(patient.address)
      ).to.be.revertedWith("Not authorized to view records");
    });

    it("should reject doctor access after revocation", async function () {
      await mediLedger.connect(patient).grantAccess(doctor.address);
      await mediLedger.connect(patient).revokeAccess(doctor.address);
      await expect(
        mediLedger.connect(doctor).getPatientRecords(patient.address)
      ).to.be.revertedWith("Not authorized to view records");
    });
  });

  describe("Hospital Addresses", function () {
    it("should track registered hospital addresses", async function () {
      await mediLedger.registerHospital(hospital.address, "City Hospital", "New York");
      await mediLedger.registerHospital(otherUser.address, "County Hospital", "LA");

      const addresses = await mediLedger.getHospitalAddresses();
      expect(addresses.length).to.equal(2);
      expect(addresses[0]).to.equal(hospital.address);
      expect(addresses[1]).to.equal(otherUser.address);
    });
  });
});
