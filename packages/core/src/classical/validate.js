import { CLASSICAL_HINSHI, CLASSICAL_KATSUYOU_TYPE, CLASSICAL_KATSUYOUKEI, INDEPENDENT_HINSHI, KAKARIMUSUBI_PARTICLES, isClassicalKatsuyouTypeCompatible, } from './schema.js';
const CONJUGATING_HINSHI = ['動詞', '形容詞', '形容動詞', '助動詞'];
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isNonnegativeInteger(value) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
function isNonemptyString(value) {
    return typeof value === 'string' && value.length > 0;
}
function includesString(values, value) {
    return typeof value === 'string' && values.includes(value);
}
export function validateClassicalPassage(input) {
    const diagnostics = [];
    const issue = (code, message, location = {}) => {
        diagnostics.push({ code, message, severity: 'error', ...location });
    };
    if (!isObject(input)) {
        issue('classical.invalid-root', 'Classical passage must be an object.');
        return { valid: false, diagnostics };
    }
    const text = input.text;
    if (typeof text !== 'string') {
        issue('classical.invalid-text', 'Passage text must be a string.');
    }
    if (!Array.isArray(input.bunsetsu)) {
        issue('classical.invalid-bunsetsu', 'Passage bunsetsu must be an array.');
    }
    if (typeof text !== 'string' || !Array.isArray(input.bunsetsu)) {
        return { valid: false, diagnostics };
    }
    if (input.bunsetsu.length === 0) {
        issue('classical.empty-bunsetsu', 'Passage must contain at least one bunsetsu.');
    }
    const bunsetsu = [];
    const tangoRecords = new Map();
    const links = [];
    const allIds = new Set();
    let expectedStart = 0;
    Array.from(input.bunsetsu).forEach((candidate, bunsetsuIndex) => {
        const path = `bunsetsu[${bunsetsuIndex}]`;
        if (!isObject(candidate)) {
            issue('classical.invalid-bunsetsu-item', `${path} must be an object.`);
            return;
        }
        const id = candidate.id;
        const validId = isNonemptyString(id);
        if (!validId) {
            issue('classical.invalid-bunsetsu-id', `${path}.id must be a nonempty string.`);
        }
        else if (allIds.has(id)) {
            issue('classical.duplicate-id', `Duplicate identifier: ${id}.`);
        }
        else {
            allIds.add(id);
        }
        const bunsetsuId = validId ? id : path;
        const start = candidate.start;
        const end = candidate.end;
        const validStart = isNonnegativeInteger(start);
        const validEnd = isNonnegativeInteger(end);
        if (!validStart || !validEnd) {
            issue('classical.invalid-bunsetsu-span', `${path} start/end must be nonnegative safe integers.`);
        }
        else {
            if (start !== expectedStart) {
                issue('classical.noncontiguous-bunsetsu', `${path} must start at ${expectedStart}; received ${start}.`, { start, end });
                expectedStart = start;
            }
            if (end <= start) {
                issue('classical.invalid-bunsetsu-span', `${path}.end must be greater than start.`, {
                    start,
                    end,
                });
            }
            if (end > text.length) {
                issue('classical.bunsetsu-out-of-bounds', `${path} exceeds the source text.`, { start, end });
            }
            expectedStart = end;
        }
        if (!Array.isArray(candidate.tango)) {
            issue('classical.invalid-tango', `${path}.tango must be an array.`);
            return;
        }
        if (candidate.tango.length === 0) {
            issue('classical.empty-tango', `${path} must contain at least one tango.`);
        }
        const validTango = [];
        let expectedTangoStart = validStart ? start : 0;
        Array.from(candidate.tango).forEach((tangoCandidate, tangoIndex) => {
            const tangoPath = `${path}.tango[${tangoIndex}]`;
            if (!isObject(tangoCandidate)) {
                issue('classical.invalid-tango-item', `${tangoPath} must be an object.`);
                return;
            }
            const tangoId = tangoCandidate.id;
            const validTangoId = isNonemptyString(tangoId);
            if (!validTangoId) {
                issue('classical.invalid-tango-id', `${tangoPath}.id must be a nonempty string.`);
            }
            else if (allIds.has(tangoId)) {
                issue('classical.duplicate-id', `Duplicate identifier: ${tangoId}.`, {
                    tangoIds: [tangoId],
                });
            }
            else {
                allIds.add(tangoId);
            }
            const referenceId = validTangoId ? tangoId : tangoPath;
            const tangoStart = tangoCandidate.start;
            const tangoEnd = tangoCandidate.end;
            const validTangoStart = isNonnegativeInteger(tangoStart);
            const validTangoEnd = isNonnegativeInteger(tangoEnd);
            if (!validTangoStart || !validTangoEnd) {
                issue('classical.invalid-tango-span', `${tangoPath} start/end must be nonnegative safe integers.`);
            }
            else {
                if (tangoStart !== expectedTangoStart) {
                    issue('classical.noncontiguous-tango', `${tangoPath} must start at ${expectedTangoStart}; received ${tangoStart}.`, { start: tangoStart, end: tangoEnd, tangoIds: [referenceId] });
                }
                if (tangoEnd <= tangoStart) {
                    issue('classical.invalid-tango-span', `${tangoPath}.end must be greater than start.`, {
                        start: tangoStart,
                        end: tangoEnd,
                        tangoIds: [referenceId],
                    });
                }
                if (tangoEnd > text.length) {
                    issue('classical.tango-out-of-bounds', `${tangoPath} exceeds the source text.`, {
                        start: tangoStart,
                        end: tangoEnd,
                        tangoIds: [referenceId],
                    });
                }
                if (validStart && tangoStart < start) {
                    issue('classical.tango-outside-bunsetsu', `${tangoPath} starts before its bunsetsu.`, {
                        start: tangoStart,
                        end: tangoEnd,
                        tangoIds: [referenceId],
                    });
                }
                if (validEnd && tangoEnd > end) {
                    issue('classical.tango-outside-bunsetsu', `${tangoPath} ends after its bunsetsu.`, {
                        start: tangoStart,
                        end: tangoEnd,
                        tangoIds: [referenceId],
                    });
                }
                expectedTangoStart = tangoEnd;
            }
            const surface = tangoCandidate.surface;
            if (!isNonemptyString(surface)) {
                issue('classical.invalid-surface', `${tangoPath}.surface must be a nonempty string.`, {
                    tangoIds: [referenceId],
                });
            }
            else if (validTangoStart &&
                validTangoEnd &&
                tangoEnd >= tangoStart &&
                tangoEnd <= text.length &&
                text.slice(tangoStart, tangoEnd) !== surface) {
                issue('classical.surface-mismatch', `${tangoPath}.surface does not match its source span.`, {
                    start: tangoStart,
                    end: tangoEnd,
                    tangoIds: [referenceId],
                });
            }
            const hinshi = tangoCandidate.hinshi;
            const validHinshi = includesString(CLASSICAL_HINSHI, hinshi);
            if (!validHinshi) {
                issue('classical.unknown-hinshi', `${tangoPath}.hinshi is not a supported 品詞.`, {
                    tangoIds: [referenceId],
                });
            }
            const independent = tangoCandidate.isIndependent;
            if (typeof independent !== 'boolean') {
                issue('classical.invalid-independence', `${tangoPath}.isIndependent must be boolean.`, {
                    tangoIds: [referenceId],
                });
            }
            else if (validHinshi && independent !== INDEPENDENT_HINSHI.includes(hinshi)) {
                issue('classical.independence-mismatch', `${tangoPath}.isIndependent conflicts with 品詞.`, {
                    tangoIds: [referenceId],
                });
            }
            const katsuyouType = tangoCandidate.katsuyouType;
            const katsuyoukei = tangoCandidate.katsuyoukei;
            const hasType = katsuyouType !== undefined;
            const hasKei = katsuyoukei !== undefined;
            const validType = !hasType || includesString(CLASSICAL_KATSUYOU_TYPE, katsuyouType);
            const validKei = !hasKei || includesString(CLASSICAL_KATSUYOUKEI, katsuyoukei);
            if (!validType) {
                issue('classical.unknown-katsuyou-type', `${tangoPath}.katsuyouType is not classical.`, {
                    tangoIds: [referenceId],
                });
            }
            if (!validKei) {
                issue('classical.unknown-katsuyoukei', `${tangoPath}.katsuyoukei is not classical.`, {
                    tangoIds: [referenceId],
                });
            }
            if (validHinshi) {
                const conjugates = CONJUGATING_HINSHI.includes(hinshi);
                if (conjugates && (!hasType || !hasKei)) {
                    issue('classical.missing-katsuyou', `${tangoPath} requires both katsuyouType and katsuyoukei.`, {
                        tangoIds: [referenceId],
                    });
                }
                if (!conjugates && (hasType || hasKei)) {
                    issue('classical.unexpected-katsuyou', `${tangoPath}.品詞 cannot have conjugation data.`, {
                        tangoIds: [referenceId],
                    });
                }
                if (conjugates &&
                    validType &&
                    hasType &&
                    !isClassicalKatsuyouTypeCompatible(hinshi, katsuyouType)) {
                    issue('classical.incompatible-katsuyou', `${tangoPath} has incompatible 品詞 and 活用.`, {
                        tangoIds: [referenceId],
                    });
                }
            }
            const optionalStrings = ['baseForm', 'reading', 'subHinshi', 'historicalKana', 'modernReading'];
            for (const key of optionalStrings) {
                const value = tangoCandidate[key];
                if (value !== undefined && !isNonemptyString(value)) {
                    issue('classical.invalid-metadata', `${tangoPath}.${key} must be a nonempty string.`, {
                        tangoIds: [referenceId],
                    });
                }
            }
            if (tangoCandidate.rawMorphemes !== undefined) {
                issue('classical.unexpected-raw-morphemes', `${tangoPath} cannot contain rawMorphemes.`, {
                    tangoIds: [referenceId],
                });
            }
            const meaningTags = tangoCandidate.meaningTags;
            if (meaningTags !== undefined &&
                (!Array.isArray(meaningTags) || meaningTags.some((tag) => !isNonemptyString(tag)))) {
                issue('classical.invalid-meaning-tags', `${tangoPath}.meaningTags must contain nonempty strings.`, {
                    tangoIds: [referenceId],
                });
            }
            const kakarimusubi = tangoCandidate.kakarimusubi;
            if (kakarimusubi !== undefined && !Array.isArray(kakarimusubi)) {
                issue('classical.invalid-kakarimusubi', `${tangoPath}.kakarimusubi must be an array.`, {
                    tangoIds: [referenceId],
                });
            }
            if (validTangoId && !tangoRecords.has(tangoId)) {
                const tango = tangoCandidate;
                const record = { tango, bunsetsuId };
                tangoRecords.set(tangoId, record);
                if (Array.isArray(kakarimusubi)) {
                    Array.from(kakarimusubi).forEach((linkCandidate, linkIndex) => {
                        const linkPath = `${tangoPath}.kakarimusubi[${linkIndex}]`;
                        if (!isObject(linkCandidate)) {
                            issue('classical.invalid-kakarimusubi-link', `${linkPath} must be an object.`, {
                                tangoIds: [tangoId],
                            });
                            return;
                        }
                        const particleTangoId = linkCandidate.particleTangoId;
                        const predicateTangoId = linkCandidate.predicateTangoId;
                        const particle = linkCandidate.particle;
                        if (!isNonemptyString(particleTangoId) || !isNonemptyString(predicateTangoId)) {
                            issue('classical.invalid-kakarimusubi-reference', `${linkPath} requires nonempty target IDs.`, {
                                tangoIds: [tangoId],
                            });
                        }
                        if (!includesString(KAKARIMUSUBI_PARTICLES, particle)) {
                            issue('classical.invalid-kakarimusubi-particle', `${linkPath}.particle is unsupported.`, {
                                tangoIds: [tangoId],
                            });
                        }
                        if (isNonemptyString(particleTangoId) &&
                            isNonemptyString(predicateTangoId) &&
                            includesString(KAKARIMUSUBI_PARTICLES, particle)) {
                            links.push({
                                link: { particleTangoId, predicateTangoId, particle },
                                owner: record,
                            });
                        }
                    });
                }
            }
            if (validTangoId &&
                validTangoStart &&
                validTangoEnd &&
                isNonemptyString(surface) &&
                validHinshi &&
                typeof independent === 'boolean') {
                validTango.push(tangoCandidate);
            }
        });
        if (validStart && validEnd && expectedTangoStart !== end) {
            issue('classical.incomplete-bunsetsu-coverage', `${path}.tango must end at the bunsetsu end.`, {
                start,
                end,
            });
        }
        if (validId && validStart && validEnd) {
            bunsetsu.push({ id, tango: validTango, start, end });
        }
    });
    if (expectedStart !== text.length) {
        issue('classical.incomplete-text-coverage', `Bunsetsu must cover the full source text of length ${text.length}.`);
    }
    for (const { link, owner } of links) {
        const particleRecord = tangoRecords.get(link.particleTangoId);
        const predicateRecord = tangoRecords.get(link.predicateTangoId);
        if (!particleRecord) {
            issue('classical.unknown-kakarimusubi-particle-target', `Unknown particle tango: ${link.particleTangoId}.`, {
                tangoIds: [owner.tango.id, link.particleTangoId],
            });
        }
        if (!predicateRecord) {
            issue('classical.unknown-kakarimusubi-predicate-target', `Unknown predicate tango: ${link.predicateTangoId}.`, {
                tangoIds: [owner.tango.id, link.predicateTangoId],
            });
        }
        if (!particleRecord || !predicateRecord)
            continue;
        const particle = particleRecord.tango;
        const predicate = predicateRecord.tango;
        if (particle.hinshi !== '助詞' || particle.surface !== link.particle) {
            issue('classical.invalid-kakarimusubi-particle-target', 'Particle target must be the declared 係助詞.', {
                start: particle.start,
                end: particle.end,
                tangoIds: [owner.tango.id, particle.id],
            });
        }
        if (predicate.start <= particle.start) {
            issue('classical.kakarimusubi-order', 'Predicate must follow the 係助詞.', {
                tangoIds: [particle.id, predicate.id],
            });
        }
        if (!CONJUGATING_HINSHI.includes(predicate.hinshi)) {
            issue('classical.invalid-kakarimusubi-predicate', 'Kakarimusubi predicate must be conjugating.', {
                start: predicate.start,
                end: predicate.end,
                tangoIds: [predicate.id],
            });
        }
        const expectedKei = link.particle === 'こそ' ? '已然形' : '連体形';
        if (predicate.katsuyoukei !== expectedKei) {
            issue('classical.kakarimusubi-form', `${link.particle} requires predicate ${expectedKei}.`, {
                start: predicate.start,
                end: predicate.end,
                tangoIds: [particle.id, predicate.id],
            });
        }
    }
    if (diagnostics.length > 0) {
        return { valid: false, diagnostics };
    }
    return {
        valid: true,
        diagnostics,
        value: { mode: 'classical', text, bunsetsu, diagnostics: [] },
    };
}
//# sourceMappingURL=validate.js.map