import logging
import sys
from .config import PROJECT_ROOT


def setup_logging():
    # 日志目录
    log_dir = PROJECT_ROOT / "storage" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    # 根日志记录器
    root = logging.getLogger()
    root.setLevel(logging.DEBUG)

    # 格式：时间 级别 模块:行号 - 消息
    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # 1) 控制台输出（INFO 及以上）
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(logging.INFO)
    console.setFormatter(fmt)
    root.addHandler(console)

    # 2) 文件日志（DEBUG 及以上，记录所有细节）
    file_handler = logging.FileHandler(
        log_dir / "app.log", encoding="utf-8", mode="a"
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(fmt)
    root.addHandler(file_handler)

    # 3) 错误日志单独文件（ERROR 及以上）
    err_handler = logging.FileHandler(
        log_dir / "error.log", encoding="utf-8", mode="a"
    )
    err_handler.setLevel(logging.ERROR)
    err_handler.setFormatter(fmt)
    root.addHandler(err_handler)

    # 减少第三方库的冗长日志
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)

    return logging.getLogger(__name__)
