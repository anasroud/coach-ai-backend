import { Metrics, ReportModel } from "./report.model";

export interface HistoryEntry {
  metrics: Metrics;
  createdAt: Date;
}
interface RawRow {
  createdAt: Date;
  metrics?: Partial<Metrics>;
}

export const ReportService = {
  list(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return Promise.all([
      ReportModel.find({ ownerId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ReportModel.countDocuments({ ownerId: userId }),
    ]).then(([data, total]) => ({
      data,
      total,
      page,
      pages: Math.ceil(total / limit),
    }));
  },

  async lastNMetrics(userId: string, n = 5): Promise<HistoryEntry[]> {
    const rows: RawRow[] = await ReportModel.find({ ownerId: userId })
      .sort({ createdAt: -1 })
      .limit(n)
      .select({ metrics: 1, createdAt: 1 })
      .lean<RawRow[]>()
      .exec();

    return rows
      .filter((r): r is RawRow & { metrics: Partial<Metrics> } => !!r.metrics)
      .map(
        (r): HistoryEntry => ({
          createdAt: r.createdAt,
          metrics: {
            wpm: r.metrics.wpm ?? 0,
            fillerRate: r.metrics.fillerRate ?? 0,
            avgPauseMs: r.metrics.avgPauseMs ?? 0,
            sentiment:
              (r.metrics.sentiment as Metrics["sentiment"]) ?? "neutral",
            wordErrorRate: r.metrics.wordErrorRate ?? 0,
          } as Metrics,
        })
      );
  },

  find(userId: string, reportId: string) {
    return ReportModel.findOne({ _id: reportId, ownerId: userId }).lean();
  },

  remove(userId: string, reportId: string) {
    return ReportModel.deleteOne({ _id: reportId, ownerId: userId });
  },
};
