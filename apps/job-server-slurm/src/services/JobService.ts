import { plugin } from "@ddadaal/tsgrpc-server";
import { ServiceError, status } from "@grpc/grpc-js";
import { join } from "path";
import { LOGIN_NODES } from "src/config";
import { RunningJob } from "src/generated/common/job";
import { JobServiceServer, JobServiceService } from "src/generated/portal/job";
import { loggedExec } from "src/plugins/ssh";
import { withTmpFile } from "src/utils/tmp";

export function parseSbatchOutput(output: string): number {
  // Submitted batch job 34987
  const splitted = output.split(" ");
  return +splitted[splitted.length-1];
}

export const jobServiceServer = plugin((server) => {

  server.addService<JobServiceServer>(JobServiceService, {

    submitJob: async ({ request, logger }) => {
      const { command, jobName, userId } = request;

      const node = Object.keys(LOGIN_NODES)[0];
      return await server.ext.connect(node, userId, logger, async (ssh) => {
        // create a dir named job name
        const jobScriptName = "job.sh";
        const dir = `jobs/${jobName}`;
        const scriptPath = join(dir, jobScriptName);
        const rootSFTP = await ssh.requestSFTP();

        await ssh.mkdir(dir, undefined, rootSFTP);

        // create a tmp file and send the file into the cluster
        await withTmpFile(async ({ path, fd }) => { // write the command into the tmp file
          await fd.writeFile(command);

          // send the file into the dir
          await ssh.putFile(path, scriptPath, rootSFTP);
        });

        // use sbatch to allocate the script
        const { code, stderr, stdout } = await loggedExec(ssh, logger, false,
          "sbatch", [jobScriptName],
          { cwd: dir, stream: "both" },
        );

        if (code !== 0) {
          throw <ServiceError> {
            code: status.UNAVAILABLE,
            message: "slurm job submission failed.",
            details: stderr,
          };
        }

        // parse stdout output to get the job id
        const jobId = parseSbatchOutput(stdout);

        return [{ jobId }];
      });

    },

    getRunningJobs: async ({ request, logger }) => {
      const { userId } = request;
      const separator = "__x__x__";

      const node = Object.keys(LOGIN_NODES)[0];

      return await server.ext.connect(node, userId, logger, async (ssh) => {
        const result = await loggedExec(ssh, logger, true,
          "squeue",
          [
            "-o",
            `'${["%A", "%P", "%j", "%u", "%T", "%M", "%D", "%R", "%a", "%C", "%q", "%V", "%Y", "%l"].join(separator)}'`,
            "--noheader",
            "-u", userId,
          ],
        );

        const jobs = result.stdout.split("\n").filter((x) => x).map((x) => {
          const [
            jobId,
            partition, name, user, state, runningTime,
            nodes, nodesOrReason, account, cores,
            qos, submissionTime, nodesToBeUsed, timeLimit,
          ] = x.split(separator);

          return {
            jobId,
            partition, name, user, state, runningTime,
            nodes, nodesOrReason, account, cores,
            qos, submissionTime, nodesToBeUsed, timeLimit,
          } as RunningJob;
        });

        return [{ jobs }];
      });

    },
  });
});
