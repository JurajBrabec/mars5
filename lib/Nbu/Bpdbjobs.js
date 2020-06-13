module.exports = ({ nbu, target }) => ({
  Summary: {
    binary: {
      file: [nbu.bin, "/admincmd/bpdbjobs.exe"].join("/"),
      args: ["-summary", "-l"],
    },
    structure: {
      delimiter: /(\r?\n){2}/m,
      chain: (source, target) => source.expect(/^Summary/).match(target),
      target,
    },
    data: {
      bpdbjobs_summary: [
        { masterServer: /^Summary of jobs on (\S+)/m, key: true },
        { queued: /^Queued:\s+(\d+)/m },
        { waiting: /^Waiting-to-Retry:\s+(\d+)/m },
        { active: /^Active:\s+(\d+)/m },
        { successful: /^Successful:\s+(\d+)/m },
        { partial: /^Partially Successful:\s+(\d+)/m },
        { failed: /^Failed:\s+(\d+)/m },
        { incomplete: /^Incomplete:\s+(\d+)/m },
        { suspended: /^Suspended:\s+(\d+)/m },
        { total: /^Total:\s+(\d+)/m },
      ],
    },
  },
  Jobs: {
    binary: {
      file: "NBU_BIN/admincmd/bpdbjobs.exe",
      args: ["-report", "-most_columns"],
    },
    structure: {
      delimiter: /r?\n/m,
      chain: (source, target) =>
        source.expect(/^\d+/).split().separate(",").assign(target),
      flush: (target) => target.end(),
    },
    data: {
      bpdbjobs_report: [
        { jobId: "number", key: true },
        { jobType: "number" },
        { state: "number" },
        { status: "number" },
        { policy: "string" },
        { schedule: "string" },
        { client: "string" },
        { server: "string" },
        { started: "number" },
        { elapsed: "number" },
        { ended: "number" },
        { stunit: "string" },
        { tries: "number" },
        { operation: "string" },
        { kbytes: "number" },
        { files: "number" },
        { pathlastwritten: "string" },
        { percent: "number" },
        { jobpid: "number" },
        { owner: "string" },
        { subtype: "number" },
        { policytype: "number" },
        { scheduletype: "number" },
        { priority: "number" },
        { group: "string" },
        { masterServer: "string" },
        { retentionlevel: "number" },
        { retentionperiod: "number" },
        { compression: "number" },
        { kbytestobewritten: "number" },
        { filestobewritten: "number" },
        { filelistcount: "number" },
        { trycount: "number" },
        { parentjob: "number" },
        { kbpersec: "number" },
        { copy: "number" },
        { robot: "string" },
        { vault: "string" },
        { profile: "string" },
        { session: "string" },
        { ejecttapes: "string" },
        { srcstunit: "string" },
        { srcserver: "string" },
        { srcmedia: "string" },
        { dstmedia: "string" },
        { stream: "number" },
        { suspendable: "number" },
        { resumable: "number" },
        { restartable: "number" },
        { datamovement: "number" },
        { snapshot: "number" },
        { backupid: "string" },
        { killable: "number" },
        { controllinghost: "number" },
        { offhosttype: "number" },
        { ftusage: "number" },
        //        { queuereason: "number" },
        { reasonstring: "string" },
        { dedupratio: "float" },
        { accelerator: "number" },
        { instancedbname: "string" },
        { rest1: "string" },
        { rest2: "string" },
      ],
    },
  },
});