import { OperateService } from "../../services/operateService.js";
import { wsLogger } from "../../utils/logger.js";
import { createErrorResponse, createSuccessResponse } from "../builders/messageBuilder.js";
var Command;
(function (Command) {
    Command["START"] = "start";
    Command["STOP"] = "stop";
    Command["RESTART"] = "restart";
})(Command || (Command = {}));
export const createCommandHandler = () => {
    return async ({ send }, message) => {
        try {
            const { meta, payload } = message;
            const command = payload.params;
            const operateService = OperateService.getInstance();
            wsLogger.info({
                ...meta,
                action: payload.action,
            }, "执行中转服务命令");
            switch (command) {
                case Command.START:
                    await operateService.start();
                    break;
                case Command.STOP:
                    await operateService.stop();
                    break;
            }
            wsLogger.info({ messageId: message.meta.messageId }, "服务命令执行成功");
            const response = createSuccessResponse(message, `服务命令执行成功`);
            send(response);
        }
        catch (error) {
            wsLogger.error({ error, messageId: message.meta.messageId }, "服务命令执行失败");
            const response = createErrorResponse(message, error, "服务命令执行失败");
            send(response);
        }
    };
};
