import { useEffect, useState } from "react";
import {
  inputCost,
  outputCost,
  contextLimit,
  formatCost,
  perKCost,
} from "./data";
import { Icon } from "./Icon";
import "./detail.css";

const VISION = ["image", "video", "audio", "pdf"];

// ponytail: 原文 token 展示，含 xhigh；未知档位按 API 原样附后
const EFFORT_ORDER = ["none", "low", "medium", "high", "xhigh", "max"];

function modTagClass(m) {
  return ["text"].includes(m) ? "text" : m;
}

function ReasoningHero({ row }) {
  if (!row.reasoning) {
    return (
      <div className="reason-hero off">
        <div className="rh-top">
          <Icon name="brain" size={15} />
          <span className="rh-name">推理 / 思考链</span>
          <span className="rh-pill no">不支持</span>
        </div>
      </div>
    );
  }
  const effort = row.reasoning_options?.find((o) => o.type === "effort");
  const values = effort?.values || [];
  const ordered = values
    .filter((v) => EFFORT_ORDER.includes(v))
    .sort((a, b) => EFFORT_ORDER.indexOf(a) - EFFORT_ORDER.indexOf(b));
  const others = values.filter((v) => !EFFORT_ORDER.includes(v));
  const tags = [...ordered, ...others];
  const hasBudget = row.reasoning_options?.some(
    (o) => o.type === "budget_tokens",
  );
  const hasToggle = row.reasoning_options?.some((o) => o.type === "toggle");

  return (
    <div className="reason-hero">
      <div className="rh-top">
        <Icon name="brain" size={15} />
        <span className="rh-name">推理 / 思考链</span>
        <span className="rh-pill yes">支持</span>
      </div>
      {tags.length > 0 && (
        <div className="effort-row">
          <span className="er-label">思考水平</span>
          {tags.map((v) => (
            <span key={v} className="effort-tag">
              {v}
            </span>
          ))}
        </div>
      )}
      {(hasBudget || hasToggle || row.interleaved) && (
        <div className="effort-meta">
          {hasBudget && <span>· 支持 budget_tokens 控制思考预算</span>}
          {hasToggle && <span>· 支持 toggle 开关</span>}
          {row.interleaved && (
            <span>
              · 交错推理 (
              {typeof row.interleaved === "object"
                ? row.interleaved.field
                : "on"}
              )
            </span>
          )}
        </div>
      )}
      {!tags.length && !hasBudget && !hasToggle && (
        <div className="effort-meta">
          <span>· 默认开启，未提供档位配置</span>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="sd-section">
      <div className="ss-title">{title}</div>
      {children}
    </div>
  );
}

export default function Detail({ row, onClose }) {
  const [copied, setCopied] = useState(false);
  const pk = perKCost(row);
  const ctx = contextLimit(row);
  const inMax = row.limit?.input;
  const outMax = row.limit?.output;
  const openUrl = (u) =>
    window.utools?.shellOpenExternal?.(u) || window.open(u, "_blank");

  useEffect(() => {
    setCopied(false);
  }, [row.id]);

  const copyId = () => {
    window.services?.copyText?.(row.id);
    setCopied(true);
    clearTimeout(copyId._t);
    copyId._t = setTimeout(() => setCopied(false), 1200);
  };

  // 格式化为 K/M
  const fmt = (n) => {
    if (n == null) return ["—", ""];
    if (n >= 1_000_000)
      return [(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0), "M"];
    if (n >= 1000) return [Math.round(n / 1000), "K"];
    return [String(n), ""];
  };
  const [ctxV, ctxU] = fmt(ctx);
  const [inV, inU] = fmt(inMax);
  const [outV, outU] = fmt(outMax);

  const inMods = row.modalities?.input || [];
  const outMods = row.modalities?.output || [];
  const multimodal =
    inMods.filter((m) => VISION.includes(m)).length > 0 ||
    outMods.filter((m) => m !== "text").length > 0;

  return (
    <div className="side-detail">
      <div className="sd-head">
        <h1>
          {row.name}
          {row.status && (
            <span className={`tag-status ${row.status}`}>{row.status}</span>
          )}
        </h1>
        <button className="sd-close" onClick={onClose} title="关闭预览">
          ×
        </button>
      </div>

      <div className="sd-body">
        {row.description && <p className="sd-desc">{row.description}</p>}

        {/* 重点 1: Model ID */}
        <div className="id-card">
          <div className="id-label">Model ID · AI SDK 标识</div>
          <div className="id-row">
            <div className="id-value">{row.id}</div>
            <button
              className={`id-copy ${copied ? "ok" : ""}`}
              onClick={copyId}
              title={copied ? "已复制" : "复制 ID"}
              type="button"
            >
              <Icon name={copied ? "check" : "copy"} size={13} />
            </button>
          </div>
        </div>

        {/* 重点 2: 上下文 */}
        <div className="ctx-hero">
          <div className={`ctx-cell ${ctx != null ? "primary" : ""}`}>
            <div className="ctx-lbl">上下文</div>
            <div className="ctx-val">
              {ctxV}
              <span className="ctx-unit">{ctxU}</span>
            </div>
            <div className="ctx-sub">总窗口</div>
          </div>
          <div className="ctx-cell">
            <div className="ctx-lbl">输入上限</div>
            <div className="ctx-val">
              {inV}
              <span className="ctx-unit">{inU}</span>
            </div>
            <div className="ctx-sub">max input</div>
          </div>
          <div className="ctx-cell">
            <div className="ctx-lbl">输出上限</div>
            <div className="ctx-val">
              {outV}
              <span className="ctx-unit">{outU}</span>
            </div>
            <div className="ctx-sub">max output</div>
          </div>
        </div>

        {/* 重点 3: 推理 + 思考水平 */}
        <ReasoningHero row={row} />

        {/* 重点 4: 多模态 / 输入输出类型 */}
        <div className="mod-hero">
          <div className="mod-block">
            <span className="mb-arrow">↓</span>
            <span className="mb-label">输入</span>
            <div className="mod-tags">
              {inMods.length === 0 ? (
                <span className="mod-tag none">未声明</span>
              ) : (
                inMods.map((m) => (
                  <span key={m} className={`mod-tag ${modTagClass(m)}`}>
                    {m}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="mod-block">
            <span className="mb-arrow">↑</span>
            <span className="mb-label">输出</span>
            <div className="mod-tags">
              {outMods.length === 0 ? (
                <span className="mod-tag none">未声明</span>
              ) : (
                outMods.map((m) => (
                  <span key={m} className={`mod-tag ${modTagClass(m)}`}>
                    {m}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="mod-block">
            <span className="mb-arrow">◇</span>
            <span className="mb-label">多模态</span>
            <div className="mod-tags">
              {multimodal ? (
                <span className="mod-tag image">支持非文本模态</span>
              ) : (
                <span className="mod-tag text">仅文本</span>
              )}
            </div>
          </div>
        </div>

        {/* ===== 次要信息 ===== */}
        <Section title="其他能力">
          <div className="cap-row">
            <span className={`cap-tag ${row.tool_call ? "on" : "off"}`}>
              <span className="d" />
              工具调用
            </span>
            <span className={`cap-tag ${row.structured_output ? "on" : "off"}`}>
              <span className="d" />
              结构化输出
            </span>
            <span className={`cap-tag ${row.attachment ? "on" : "off"}`}>
              <span className="d" />
              附件
            </span>
            <span className={`cap-tag ${row.temperature ? "on" : "off"}`}>
              <span className="d" />
              温度控制
            </span>
            <span className={`cap-tag ${row.open_weights ? "on" : "off"}`}>
              <span className="d" />
              开源权重
            </span>
          </div>
        </Section>

        <Section title="价格 / 百万 token (USD)">
          <div className="price-mini">
            <div className="pm-card">
              <div className="pm-l">输入</div>
              <div className="pm-v">{formatCost(inputCost(row))}</div>
            </div>
            <div className="pm-card hl">
              <div className="pm-l">输出</div>
              <div className="pm-v">{formatCost(outputCost(row))}</div>
            </div>
            {row.cost?.reasoning != null && (
              <div className="pm-card">
                <div className="pm-l">推理</div>
                <div className="pm-v">{formatCost(row.cost.reasoning)}</div>
              </div>
            )}
            {row.cost?.cache_read != null && (
              <div className="pm-card">
                <div className="pm-l">缓存读</div>
                <div className="pm-v">{formatCost(row.cost.cache_read)}</div>
              </div>
            )}
            {row.cost?.cache_write != null && (
              <div className="pm-card">
                <div className="pm-l">缓存写</div>
                <div className="pm-v">{formatCost(row.cost.cache_write)}</div>
              </div>
            )}
            {row.cost?.input_audio != null && (
              <div className="pm-card">
                <div className="pm-l">音频入</div>
                <div className="pm-v">{formatCost(row.cost.input_audio)}</div>
              </div>
            )}
            {row.cost?.output_audio != null && (
              <div className="pm-card">
                <div className="pm-l">音频出</div>
                <div className="pm-v">{formatCost(row.cost.output_audio)}</div>
              </div>
            )}
          </div>
          {pk && (pk.input != null || pk.output != null) && (
            <div
              className="kv-mini"
              style={{ marginTop: 5, gridTemplateColumns: "88px 1fr" }}
            >
              <span className="k">每千 token</span>
              <span className="v mono">
                {pk.input != null ? `$${pk.input.toFixed(4)} 入` : ""}
                {pk.input != null && pk.output != null ? "   " : ""}
                {pk.output != null ? `$${pk.output.toFixed(4)} 出` : ""}
              </span>
            </div>
          )}
        </Section>

        <Section title="基本信息">
          <div className="kv-mini">
            <span className="k">Family</span>
            <span className="v">{row.family || "—"}</span>
          </div>
          <div className="kv-mini">
            <span className="k">知识截止</span>
            <span className="v">{row.knowledge || "—"}</span>
          </div>
          <div className="kv-mini">
            <span className="k">发布</span>
            <span className="v mono">{row.release_date || "—"}</span>
          </div>
          <div className="kv-mini">
            <span className="k">更新</span>
            <span className="v mono">{row.last_updated || "—"}</span>
          </div>
        </Section>

        <Section title={`厂商 · ${row.providerName}`}>
          <div className="kv-mini">
            <span className="k">Provider</span>
            <span className="v mono">{row.providerId}</span>
          </div>
          {row.providerNpm && (
            <div className="kv-mini">
              <span className="k">SDK 包</span>
              <span className="v mono">{row.providerNpm}</span>
            </div>
          )}
          {row.providerApi && (
            <div className="kv-mini">
              <span className="k">API 端点</span>
              <span className="v mono">{row.providerApi}</span>
            </div>
          )}
          {row.providerEnv?.length > 0 && (
            <div className="kv-mini">
              <span className="k">环境变量</span>
              <span className="v mono">{row.providerEnv.join("、")}</span>
            </div>
          )}
          {row.providerDoc && (
            <span
              className="link-pill"
              onClick={() => openUrl(row.providerDoc)}
            >
              <Icon name="doc" size={12} />
              厂商文档 ↗
            </span>
          )}
        </Section>

        {row.benchmarks?.length > 0 && (
          <Section title="Benchmarks">
            <table className="bench-mini">
              <thead>
                <tr>
                  <th>Benchmark</th>
                  <th>分数</th>
                  <th>指标</th>
                  <th>源</th>
                </tr>
              </thead>
              <tbody>
                {row.benchmarks.map((b, i) => (
                  <tr key={i}>
                    <td>
                      {b.name}
                      {b.version ? ` v${b.version}` : ""}
                    </td>
                    <td className="sc">{b.score}</td>
                    <td>{b.metric}</td>
                    <td>
                      {b.source ? (
                        <span className="src" onClick={() => openUrl(b.source)}>
                          ↗
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {row.weights?.length > 0 && (
          <Section title="模型权重">
            {row.weights.map((w, i) => (
              <span
                key={i}
                className="link-pill"
                onClick={() => w.url && openUrl(w.url)}
              >
                <Icon name="download" size={12} />
                {w.label || "权重"}
                {w.format ? ` · ${w.format}` : ""}
              </span>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}
