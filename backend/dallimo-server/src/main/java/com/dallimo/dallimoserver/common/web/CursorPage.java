package com.dallimo.dallimoserver.common.web;

import java.util.List;

/** 27.3장 cursor pagination 응답 */
public record CursorPage<T>(List<T> items, String nextCursor, boolean hasNext) {
}
